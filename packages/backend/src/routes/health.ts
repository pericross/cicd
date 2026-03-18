import { Router } from 'express';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';
import { DNS } from 'dns';

const router = Router();

interface HealthCheckResult {
  url: string;
  dns: { success: boolean; ip?: string; error?: string };
  http: { success: boolean; status?: number; error?: string };
  responseTime: { success: boolean; ms?: number; error?: string };
  ssl: { success: boolean; valid?: boolean; daysUntilExpiry?: number; error?: string };
  security: { headers: Record<string, string>; missing: string[] };
  overall: 'pass' | 'fail' | 'warning';
}

/**
 * GET /api/health/check
 * 完整健康检查（整合manus-cicd的health-check.sh功能）
 */
router.post('/check', async (req, res) => {
  const { url, expectedStatus = 200 } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: '请提供 url 参数'
    });
  }

  const result = await performHealthCheck(url, expectedStatus);

  res.json({
    success: result.overall !== 'fail',
    result
  });
});

/**
 * GET /api/health/check/:url
 * URL编码方式的健康检查
 */
router.get('/check/:url(*)', async (req, res) => {
  const url = decodeURIComponent(req.params.url);
  const expectedStatus = parseInt(req.query.expectedStatus as string) || 200;

  const result = await performHealthCheck(url, expectedStatus);

  res.json({
    success: result.overall !== 'fail',
    result
  });
});

/**
 * 执行健康检查
 */
async function performHealthCheck(url: string, expectedStatus: number): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    url,
    dns: { success: false },
    http: { success: false },
    responseTime: { success: false },
    ssl: { success: false },
    security: { headers: {}, missing: [] },
    overall: 'fail'
  };

  const domain = extractDomain(url);
  const isHttps = url.startsWith('https://');

  // 1. DNS检查
  try {
    const { addresses } = await dns.promises.resolve(domain);
    result.dns = {
      success: true,
      ip: addresses?.[0] || addresses
    };
  } catch (err: any) {
    result.dns = {
      success: false,
      error: err.message
    };
  }

  // 2. HTTP状态检查
  try {
    const startTime = Date.now();
    const status = await httpRequest(url);
    result.http = {
      success: status === expectedStatus,
      status
    };
    result.responseTime = {
      success: true,
      ms: Date.now() - startTime
    };
  } catch (err: any) {
    result.http = {
      success: false,
      error: err.message
    };
    result.responseTime = {
      success: false,
      error: err.message
    };
  }

  // 3. SSL检查
  if (isHttps) {
    try {
      const sslInfo = await checkSSL(domain);
      result.ssl = sslInfo;
    } catch (err: any) {
      result.ssl = {
        success: false,
        error: err.message
      };
    }
  }

  // 4. 安全头检查
  try {
    const headers = await fetchHeaders(url);
    result.security.headers = headers;
    const recommendedHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Content-Security-Policy'
    ];
    result.security.missing = recommendedHeaders.filter(h => !headers[h.toLowerCase()]);
  } catch (err: any) {
    // 安全头检查失败不影响整体
  }

  // 5. 总体状态
  const hasCriticalFailure = !result.dns.success || !result.http.success;
  const hasWarning = result.security.missing.length > 0 || 
    (result.ssl.success && result.ssl.daysUntilExpiry !== undefined && result.ssl.daysUntilExpiry < 30);

  result.overall = hasCriticalFailure ? 'fail' : hasWarning ? 'warning' : 'pass';

  return result;
}

/**
 * 提取域名
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

/**
 * HTTP请求获取状态码
 */
function httpRequest(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      resolve(res.statusCode || 0);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 获取响应头
 */
function fetchHeaders(url: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      resolve(res.headers as Record<string, string>);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 检查SSL证书
 */
async function checkSSL(domain: string): Promise<{ success: boolean; valid?: boolean; daysUntilExpiry?: number; error?: string }> {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      method: 'GET',
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      
      if (!cert || !cert.valid_to) {
        resolve({ success: false, error: 'No certificate found' });
        return;
      }

      const validTo = new Date(cert.valid_to);
      const now = new Date();
      const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      resolve({
        success: true,
        valid: daysUntilExpiry > 0,
        daysUntilExpiry
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'SSL check timeout' });
    });

    req.end();
  });
}

/**
 * GET /api/health/ping
 * 简单的ping检查
 */
router.get('/ping/:host?', async (req, res) => {
  const host = req.params.host || req.query.host as string;

  if (!host) {
    return res.json({ success: true, message: 'pong', timestamp: new Date().toISOString() });
  }

  try {
    const start = Date.now();
    execSync(`ping -c 1 -W 5 ${host}`, { stdio: 'ignore' });
    const latency = Date.now() - start;

    res.json({
      success: true,
      host,
      reachable: true,
      latency: `${latency}ms`
    });
  } catch {
    res.json({
      success: true,
      host,
      reachable: false,
      error: 'Host unreachable'
    });
  }
});

export const HealthRouter = router;
