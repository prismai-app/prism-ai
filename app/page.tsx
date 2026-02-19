export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="text-2xl font-bold">
          🔷 Prism <span className="text-blue-400">AI</span>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 text-sm text-slate-300 hover:text-white transition">
            Log in
          </button>
          <button className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition">
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center text-center px-6 py-24 max-w-4xl mx-auto">
        <div className="inline-block px-4 py-1 mb-6 text-sm bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30">
          AI literacy for everyone — not just tech people
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Understand AI through
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            the lens of your world
          </span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl">
          Personalized lessons and AI news — tailored to your profession, your
          experience level, and the way you already think. No jargon. No
          overwhelm. Just clarity.
        </p>
        <div className="flex gap-4 mb-16">
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-lg font-medium transition">
            Start Learning Free
          </button>
          <button className="px-8 py-3 border border-slate-600 hover:border-slate-400 rounded-lg text-lg text-slate-300 hover:text-white transition">
            See How It Works
          </button>
        </div>

        {/* Profession Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full max-w-3xl">
          {[
            { emoji: "🍎", title: "Educators" },
            { emoji: "💼", title: "Recruiters" },
            { emoji: "🦷", title: "Dentistry" },
            { emoji: "🏥", title: "Healthcare" },
            { emoji: "🌅", title: "Retirees" },
          ].map((prof) => (
            <div
              key={prof.title}
              className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition cursor-pointer"
            >
              <span className="text-3xl">{prof.emoji}</span>
              <span className="text-sm text-slate-300">{prof.title}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Features Section */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">
          How Prism AI works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "🎯",
              title: "Tell us who you are",
              desc: "Pick your profession and comfort level. No typing — just tap. We build your learning path in seconds.",
            },
            {
              icon: "📚",
              title: "Learn AI your way",
              desc: "Lessons use examples from YOUR field. A teacher learns AI through lesson planning. A recruiter through hiring. It just clicks.",
            },
            {
              icon: "📰",
              title: "Stay in the loop",
              desc: "Daily AI news, rewritten so it actually makes sense for your world. No tech jargon. No hype. Just what matters to you.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50"
            >
              <span className="text-4xl mb-4 block">{feature.icon}</span>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          Start free. Upgrade when you're ready.
        </h2>
        <p className="text-slate-400 text-center mb-16">
          No credit card required to get started.
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="p-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <h3 className="text-xl font-semibold mb-2">Free</h3>
            <p className="text-4xl font-bold mb-6">
              $0<span className="text-lg text-slate-400 font-normal">/month</span>
            </p>
            <ul className="space-y-3 text-slate-300">
              {[
                "First 3 lesson modules",
                "3 news articles per day",
                "Progress tracking",
                "All professions",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> {item}
                </li>
              ))}
            </ul>
            <button className="w-full mt-8 px-6 py-3 border border-slate-600 hover:border-slate-400 rounded-lg transition">
              Get Started
            </button>
          </div>
          {/* Pro Tier */}
          <div className="p-8 bg-gradient-to-b from-blue-600/20 to-slate-800/30 rounded-xl border border-blue-500/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Pro</h3>
              <span className="px-2 py-1 text-xs bg-blue-600 rounded-full">
                Most Popular
              </span>
            </div>
            <p className="text-4xl font-bold mb-6">
              $9.99<span className="text-lg text-slate-400 font-normal">/month</span>
            </p>
            <ul className="space-y-3 text-slate-300">
              {[
                "Full lesson library",
                "Unlimited news feed",
                "AI tutor chat",
                "New modules weekly",
                "Priority support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> {item}
                </li>
              ))}
            </ul>
            <button className="w-full mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition">
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-slate-800 text-center text-slate-500 text-sm">
        © 2026 Prism AI. All rights reserved.
      </footer>
    </div>
  );
}