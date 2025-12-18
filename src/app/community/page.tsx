'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ForumPost } from '@/lib/types'

const CATEGORIES = ['General', 'Strategies', 'Analysis', 'Questions', 'Success Stories']

export default function CommunityPage() {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [posting, setPosting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadPosts()
    getCurrentUser()
  }, [selectedCategory])

  const getCurrentUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const loadPosts = async () => {
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        author:users(full_name, email)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (selectedCategory) {
      query = query.eq('category', selectedCategory)
    }

    const { data, error } = await query

    if (!error && data) {
      setPosts(data as ForumPost[])
    }
    setLoading(false)
  }

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return

    setPosting(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('forum_posts')
      .insert({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        user_id: currentUserId
      })

    if (!error) {
      setNewTitle('')
      setNewContent('')
      setShowNewPost(false)
      loadPosts()
    }
    setPosting(false)
  }

  const handleLike = async (postId: string) => {
    const supabase = createClient()
    
    // Check if already liked
    const { data: existing } = await supabase
      .from('forum_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', currentUserId)
      .single()

    if (existing) {
      // Unlike
      await supabase
        .from('forum_likes')
        .delete()
        .eq('id', existing.id)
    } else {
      // Like
      await supabase
        .from('forum_likes')
        .insert({ post_id: postId, user_id: currentUserId })
    }

    loadPosts()
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold text-emerald-500">Community Forum</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm transition ${
              !selectedCategory ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm transition ${
                selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* New Post Button */}
        <button
          onClick={() => setShowNewPost(!showNewPost)}
          className="btn-primary mb-6"
        >
          {showNewPost ? 'Cancel' : '+ New Post'}
        </button>

        {/* New Post Form */}
        {showNewPost && (
          <form onSubmit={handleSubmitPost} className="card mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="input"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="input"
                placeholder="Post title..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="input min-h-[150px]"
                placeholder="Share your thoughts..."
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={posting}>
              {posting ? 'Posting...' : 'Post'}
            </button>
          </form>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No posts yet. Be the first to start a discussion!
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="card hover:border-gray-700 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {post.is_pinned && (
                      <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded-full mr-2">
                        📌 Pinned
                      </span>
                    )}
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                      {post.category}
                    </span>
                    <h3 className="text-lg font-semibold mt-2 mb-1">{post.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span>By {post.author?.full_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <button
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-1 hover:text-emerald-400 transition"
                      >
                        ❤️ {post.likes_count || 0}
                      </button>
                      <span>💬 {post.replies_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
