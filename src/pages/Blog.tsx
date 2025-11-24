import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Tag, ArrowRight } from "lucide-react";
import { blogPosts } from "@/data/blogPosts";
import { Footer } from "@/components/Footer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEO } from "@/components/SEO";
import qraftLogo from "@/assets/qrafts-logo.png";

const Blog = () => {
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Job Search Tips & Career Advice Blog"
        description="Expert advice on job applications, interview preparation, resume writing, and career development. Get tips to land your dream job faster with QRAFTS."
        keywords="job search tips, career advice, interview tips, resume writing, job application advice, career development"
        canonicalUrl={`${window.location.origin}/blog`}
      />
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

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            Blog & Resources
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Job Search Tips & <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Product Updates</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Expert advice, proven strategies, and the latest features to help you land your dream job faster.
          </p>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="container mx-auto px-4 sm:px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {sortedPosts.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`}>
              <article className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full">
                {/* Hero Image */}
                {post.image && (
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>
                )}

                <div className="p-6">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="text-primary font-medium">{post.category}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-3 text-sm">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>

                  {/* Read More Link */}
                  <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 gap-1 transition-all">
                    Read Article
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
