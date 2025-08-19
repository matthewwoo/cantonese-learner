'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

interface Article {
  id: string;
  title: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 文章列表頁面
 * 顯示用戶的所有文章，並提供添加新文章的功能
 */
export default function ArticlesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // 表單狀態
  const [articleUrl, setArticleUrl] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // 檢查認證狀態
  useEffect(() => {
    if (status === 'loading') return; // 還在載入中
    
    if (status === 'unauthenticated') {
      // 如果未認證，導向登入頁面
      router.push('/auth/signin');
      return;
    }
    
    // 如果已認證，載入文章列表
    if (status === 'authenticated') {
      fetchArticles();
    }
  }, [status, router]);

  /**
   * 從 API 獲取文章列表
   */
  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles');
      if (!response.ok) throw new Error('獲取文章失敗');
      
      const data = await response.json();
      setArticles(data.articles);
    } catch (error) {
      console.error('獲取文章失敗:', error);
      toast.error('Unable to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 從 URL 獲取文章內容
   */
  const fetchFromUrl = async () => {
    if (!articleUrl) {
      toast.error('Please enter an article URL');
      return;
    }

    setIsFetchingUrl(true);
    try {
      const response = await fetch('/api/articles/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: articleUrl }),
      });

      if (!response.ok) throw new Error('無法獲取文章內容');

      const data = await response.json();
      setArticleTitle(data.title);
      setArticleContent(data.content);
      toast.success('Successfully fetched article content!');
    } catch (error) {
      console.error('獲取文章失敗:', error);
      toast.error('Unable to fetch article from this URL');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  /**
   * 創建新文章
   */
  const handleAddArticle = async () => {
    if (!articleTitle) {
      toast.error('Please fill in article title');
      return;
    }

    // Allow creating article with just URL (content will be fetched automatically)
    if (!articleContent && !articleUrl) {
      toast.error('Please provide either article content or a URL');
      return;
    }

    setIsAdding(true);
    let loadingToast: string | undefined;
    
    try {
      // If URL is provided but no content was fetched, try to fetch it automatically
      if (articleUrl && !articleContent.trim()) {
        loadingToast = toast.loading('Fetching article content from URL...');
        try {
          const fetchResponse = await fetch('/api/articles/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: articleUrl }),
          });

          if (fetchResponse.ok) {
            const fetchData = await fetchResponse.json();
            setArticleTitle(fetchData.title);
            setArticleContent(fetchData.content);
            toast.dismiss(loadingToast);
            toast.success('Successfully fetched article content!');
          } else {
            toast.dismiss(loadingToast);
            toast.error('Unable to fetch content from URL. Please enter content manually.');
            setIsAdding(false);
            return;
          }
        } catch (fetchError) {
          toast.dismiss(loadingToast);
          toast.error('Unable to fetch content from URL. Please enter content manually.');
          setIsAdding(false);
          return;
        }
      }

      // Show translation loading state
      loadingToast = toast.loading('Creating article and translating to Traditional Chinese...');

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: articleTitle,
          content: articleContent,
          url: articleUrl || undefined,
        }),
      });

      if (!response.ok) throw new Error('創建文章失敗');

      const data = await response.json();
      toast.dismiss(loadingToast);
      toast.success('Article created and translated successfully! 🎉');
      
      // 重新載入文章列表
      await fetchArticles();
      
      // 關閉模態框並重置表單
      setShowAddModal(false);
      setArticleUrl('');
      setArticleTitle('');
      setArticleContent('');
      
      // 導航到文章閱讀頁面
      router.push(`/articles/${data.articleId}`);
    } catch (error) {
      console.error('創建文章失敗:', error);
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      toast.error('Unable to create article. Please check your translation API keys.');
    } finally {
      setIsAdding(false);
    }
  };

  /**
   * 刪除文章
   */
  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('刪除文章失敗');

      toast.success('Article deleted');
      await fetchArticles();
    } catch (error) {
      console.error('刪除文章失敗:', error);
      toast.error('Unable to delete article');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-purple-800 mb-2">
                📚 Article Reading
              </h1>
              <p className="text-gray-600">
                Learn Traditional Chinese by reading English articles with translations
              </p>
              {session?.user && (
                <p className="text-sm text-gray-500 mt-1">
                  Welcome back, {session.user.name || session.user.email}!
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform shadow-lg"
              >
                + Add New Article
              </button>
            </div>
          </div>
        </div>

        {/* 文章列表 */}
        {status === 'loading' || isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : status === 'unauthenticated' ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-500 mb-6">
              Please sign in to access your articles
            </p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform shadow-lg"
            >
              Sign In
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              No Articles Yet
            </h2>
            <p className="text-gray-500 mb-6">
              Click the button above to add your first article
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 relative group"
              >
                {/* 刪除按鈕 */}
                <button
                  onClick={() => handleDeleteArticle(article.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                  title="Delete Article"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <h3 className="text-xl font-bold text-gray-800 mb-2 pr-8">
                  {article.title}
                </h3>
                
                {article.sourceUrl && (
                  <p className="text-sm text-gray-500 mb-3 truncate">
                    📎 {new URL(article.sourceUrl).hostname}
                  </p>
                )}
                
                <p className="text-sm text-gray-400 mb-4">
                  Created on {new Date(article.createdAt).toLocaleDateString('en-US')}
                </p>
                
                <button
                  onClick={() => router.push(`/articles/${article.id}`)}
                  className="w-full bg-gradient-to-r from-blue-400 to-cyan-400 text-white py-2 rounded-lg font-semibold hover:shadow-md transition-all"
                >
                  Start Reading
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加文章模態框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            {/* Loading overlay */}
            {isAdding && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-2xl z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Creating Article...
                  </h3>
                  <p className="text-gray-600">
                    Translating to Traditional Chinese
                  </p>
                  <div className="mt-4 text-sm text-gray-500">
                    This may take a few moments depending on the article length
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Add New Article
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={isAdding}
                  className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* URL 輸入 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article URL (optional - content will be automatically fetched)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={articleUrl}
                    onChange={(e) => setArticleUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    disabled={isAdding}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={fetchFromUrl}
                    disabled={isFetchingUrl || !articleUrl || isAdding}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isFetchingUrl ? 'Fetching...' : 'Fetch Now'}
                  </button>
                </div>
                {articleUrl && (
                  <p className="text-sm text-gray-500 mt-2">
                    💡 Content will be automatically fetched when you create the article, or click "Fetch Now" to preview.
                  </p>
                )}
              </div>

              {/* 標題輸入 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article Title *
                </label>
                <input
                  type="text"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="Enter article title"
                  disabled={isAdding}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* 內容輸入 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article Content *
                </label>
                <textarea
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  placeholder="Paste or type English article content..."
                  rows={10}
                  disabled={isAdding}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* 操作按鈕 */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={isAdding}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddArticle}
                  disabled={isAdding || !articleTitle || (!articleContent && !articleUrl)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? 'Creating...' : 'Create Article'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}