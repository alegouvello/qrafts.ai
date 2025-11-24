import { Link, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Tag, ArrowLeft } from "lucide-react";
import { getBlogPost, getRecentPosts } from "@/data/blogPosts";
import { Footer } from "@/components/Footer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ReactMarkdown from "react-markdown";
import qraftLogo from "@/assets/qrafts-logo.png";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;
  const recentPosts = getRecentPosts(3).filter(p => p.slug !== slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src={qraftLogo} alt="Qrafts logo" className="h-12 sm:h-14 md:h-16 dark:invert" />
          </Link>
          
          <div className="flex items-center gap-3 lg:gap-4">
            <LanguageSwitcher />
            <Link to="/auth">
              <Button variant="outline" size="sm" className="rounded-full border-border/60 hover:border-primary/50 transition-all">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Back to Blog */}
      <div className="container mx-auto px-4 sm:px-6 pt-8">
        <Link to="/blog">
          <Button variant="ghost" className="group">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Blog
          </Button>
        </Link>
      </div>

      {/* Article */}
      <article className="container mx-auto px-4 sm:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">{post.category}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{post.readTime}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-muted-foreground mb-8 pb-8 border-b border-border">
            {post.excerpt}
          </p>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-bold mt-6 mb-3">{children}</h3>,
                p: ({ children }) => <p className="text-foreground leading-relaxed mb-4">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                li: ({ children }) => <li className="text-foreground">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{children}</code>,
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* CTA */}
          <div className="mt-12 p-8 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Job Search?</h3>
            <p className="text-muted-foreground mb-6">Join thousands of job seekers using Qrafts to land their dream jobs faster.</p>
            <Link to="/auth">
              <Button size="lg" className="rounded-full shadow-lg">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {recentPosts.length > 0 && (
        <section className="container mx-auto px-4 sm:px-6 py-16 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">More Articles</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {recentPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  to={`/blog/${relatedPost.slug}`}
                  className="group bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 text-sm text-primary mb-3">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">{relatedPost.category}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {relatedPost.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                    {relatedPost.excerpt}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    {new Date(relatedPost.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {relatedPost.readTime}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default BlogPost;
