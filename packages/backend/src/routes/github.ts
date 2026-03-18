import { Router } from 'express';
import { GitHubService } from '../services/github';

const router = Router();
let githubService: GitHubService | null = null;

function getGitHubService(): GitHubService {
  if (!githubService) {
    githubService = new GitHubService();
  }
  return githubService;
}

/**
 * GET /api/github/repos
 * 获取GitHub仓库列表
 */
router.get('/repos', async (req, res) => {
  try {
    const service = getGitHubService();
    const repos = await service.getRepositories();
    
    // 返回简化版仓库信息
    const repoList = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
      default_branch: repo.default_branch,
      language: repo.language,
      updated_at: repo.updated_at
    }));
    
    res.json({
      success: true,
      repos: repoList,
      total: repoList.length
    });
  } catch (error: any) {
    console.error('获取仓库列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/github/repos/:owner/:repo
 * 获取特定仓库详情
 */
router.get('/repos/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const service = getGitHubService();
    
    const [repository, contents, hasDockerfile] = await Promise.all([
      service.getRepository(owner, repo),
      service.getRepositoryContents(owner, repo),
      service.hasDockerfile(owner, repo)
    ]);
    
    res.json({
      success: true,
      repository: {
        id: repository.id,
        name: repository.name,
        full_name: repository.full_name,
        description: repository.description,
        private: repository.private,
        default_branch: repository.default_branch,
        language: repository.language,
        has_dockerfile: hasDockerfile,
        files: contents.slice(0, 20).map((f: any) => ({
          name: f.name,
          path: f.path,
          type: f.type
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/github/clone
 * 克隆或更新仓库到本地
 */
router.post('/clone', async (req, res) => {
  try {
    const { owner, repo, branch } = req.body;
    
    if (!owner || !repo) {
      return res.status(400).json({
        success: false,
        message: '请提供 owner 和 repo 参数'
      });
    }
    
    const service = getGitHubService();
    const repoPath = await service.cloneOrPull(owner, repo, branch || 'main');
    
    res.json({
      success: true,
      message: '仓库克隆成功',
      path: repoPath
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/github/dockerfile/:owner/:repo
 * 获取Dockerfile内容
 */
router.get('/dockerfile/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const service = getGitHubService();
    
    const content = await service.getDockerfileContent(owner, repo);
    
    res.json({
      success: true,
      dockerfile: content
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/github/cache
 * 清理本地仓库缓存
 */
router.delete('/cache', async (req, res) => {
  try {
    const service = getGitHubService();
    await service.cleanCache();
    
    res.json({
      success: true,
      message: '缓存清理成功'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export const GitHubRouter = router;
