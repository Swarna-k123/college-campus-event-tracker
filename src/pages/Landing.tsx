import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Flame,
  GraduationCap,
  MapPin,
  Shield,
  Sparkles,
  TrendingUp,
  UserCircle,
  Users,
  UsersRound,
} from "lucide-react";
import { loadTrendingEvents } from "@/lib/trendingEvents";
import "./landing.css";

const FEATURES = [
  {
    icon: UsersRound,
    title: "Club Management",
    description: "Empower clubs to plan, promote, and manage campus activities from one hub.",
  },
  {
    icon: CalendarDays,
    title: "Event Registration",
    description: "Students register for individual or team events in seconds with smart validation.",
  },
  {
    icon: MapPin,
    title: "Venue Tracking",
    description: "Keep venues, schedules, and capacity organized across every department.",
  },
  {
    icon: Shield,
    title: "Admin Control",
    description: "Approve events, manage access, and oversee campus-wide operations securely.",
  },
  {
    icon: Users,
    title: "Team Event Management",
    description: "Flexible team sizes, leader details, and member profiles built for competitions.",
  },
] as const;

const ROLES = [
  {
    icon: GraduationCap,
    title: "Students",
    description: "Discover events, register instantly, and track your campus participation.",
    accent: "#22d3ee",
  },
  {
    icon: Building2,
    title: "Club Managers",
    description: "Create events, upload posters, and manage registrations for your club.",
    accent: "#7c3aed",
  },
  {
    icon: Shield,
    title: "Admin",
    description: "Approve submissions, monitor activity, and keep the campus calendar running.",
    accent: "#f59e0b",
  },
] as const;

const STATS = [
  { label: "Active Clubs", value: "50+" },
  { label: "Events Hosted", value: "200+" },
  { label: "Student Registrations", value: "5,000+" },
  { label: "Venues Tracked", value: "120" },
] as const;

const scrollToEvents = () => {
  document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
};

const Landing = () => {
  const {
    data: trendingEvents = [],
    isLoading: trendingLoading,
  } = useQuery({
    queryKey: ["landing-trending-events"],
    queryFn: () => loadTrendingEvents(4),
    staleTime: 60_000,
  });

  return (
    <div className="landing-page min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 landing-grid-bg pointer-events-none z-0" aria-hidden />
      <div
        className="landing-gradient-orb landing-gradient-orb--primary w-[420px] h-[420px] -top-32 -left-32"
        aria-hidden
      />
      <div
        className="landing-gradient-orb landing-gradient-orb--accent w-[360px] h-[360px] top-20 right-0"
        aria-hidden
      />
      <div
        className="landing-gradient-orb landing-gradient-orb--highlight w-[280px] h-[280px] bottom-1/3 left-1/4"
        aria-hidden
      />

      <header className="relative z-10 border-b border-white/5 backdrop-blur-md bg-[#0F0F1A]/80 sticky top-0">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] shadow-lg shadow-violet-500/30">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#E5E7EB] group-hover:text-white transition-colors">
              CampusHub
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToEvents}
              className="hidden sm:inline-flex text-sm text-[#9CA3AF] hover:text-[#22D3EE] transition-colors px-3 py-2"
            >
              Events
            </button>
            <Link to="/login" className="landing-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold">
              Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="container pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            <p className="landing-animate-in inline-flex items-center gap-2 rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 px-4 py-1.5 text-xs font-medium text-[#22D3EE] mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              College event management, reimagined
            </p>
            <p className="landing-animate-in landing-delay-1 text-sm font-semibold uppercase tracking-[0.2em] text-[#7C3AED] mb-3">
              CampusHub
            </p>
            <h1 className="landing-animate-in landing-delay-2 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight landing-hero-title leading-[1.1] mb-6">
              Run Campus Events Smarter
            </h1>
            <p className="landing-animate-in landing-delay-3 text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed mb-10">
              A modern college event management platform for students, clubs, and administrators.
            </p>
            <div className="landing-animate-in landing-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="landing-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold w-full sm:w-auto"
              >
                Login
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={scrollToEvents}
                className="landing-btn-outline inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold w-full sm:w-auto"
              >
                Explore Events
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E5E7EB] mb-4">Everything you need on campus</h2>
            <p className="text-[#9CA3AF]">
              From club dashboards to admin approvals — built for the way colleges actually run events.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {FEATURES.map((feature, i) => (
              <article
                key={feature.title}
                className="landing-card rounded-2xl p-6 md:p-7"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 mb-4">
                  <feature.icon className="h-6 w-6 text-[#22D3EE]" />
                </div>
                <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="container py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E5E7EB] mb-4">Built for every role</h2>
            <p className="text-[#9CA3AF]">Students, club managers, and admins — each with the tools they need.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {ROLES.map((role) => (
              <article
                key={role.title}
                className="landing-card rounded-2xl p-8 text-center"
                style={{ borderTopColor: role.accent, borderTopWidth: 3 }}
              >
                <div
                  className="mx-auto grid h-14 w-14 place-items-center rounded-2xl mb-5"
                  style={{ backgroundColor: `${role.accent}22`, border: `1px solid ${role.accent}44` }}
                >
                  <role.icon className="h-7 w-7" style={{ color: role.accent }} />
                </div>
                <h3 className="text-xl font-semibold text-[#E5E7EB] mb-2">{role.title}</h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">{role.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Statistics */}
        <section className="container py-16 md:py-20">
          <div className="rounded-3xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#22D3EE]/10 p-8 md:p-12">
            <div className="flex items-center justify-center gap-2 mb-10">
              <TrendingUp className="h-5 w-5 text-[#F59E0B]" />
              <h2 className="text-2xl md:text-3xl font-bold text-[#E5E7EB]">Campus at a glance</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="landing-stat-value text-3xl md:text-4xl font-extrabold mb-2">{stat.value}</p>
                  <p className="text-sm text-[#9CA3AF]">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-[#6B7280] mt-8">Demo statistics — live data coming soon</p>
          </div>
        </section>

        {/* Event showcase */}
        <section id="events" className="container py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#E5E7EB] mb-3">Trending on campus</h2>
              <p className="text-[#9CA3AF] max-w-lg">
                Preview upcoming events. Sign in to register and join your college community.
              </p>
            </div>
            <Link
              to="/login"
              className="landing-btn-outline inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shrink-0 self-start md:self-auto"
            >
              <UserCircle className="h-4 w-4" />
              Sign in to register
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trendingLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <article
                  key={`trending-skeleton-${i}`}
                  className="landing-event-card rounded-2xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-[#1e1b2e]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#1e1b2e] rounded w-3/4" />
                    <div className="h-3 bg-[#1e1b2e] rounded w-1/2" />
                  </div>
                </article>
              ))
            ) : trendingEvents.map((event) => (
              <article key={event.id} className="landing-event-card rounded-2xl overflow-hidden">
                <div className="aspect-[4/3] relative bg-gradient-to-br from-[#7C3AED]/70 to-[#22D3EE]/50 overflow-hidden">
                  {event.posterUrl ? (
                    <img
                      src={event.posterUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#7C3AED]/80 via-[#5b21b6]/70 to-[#22D3EE]/40">
                      <CalendarDays className="h-10 w-10 text-white/50" aria-hidden />
                      <span className="text-xs font-medium text-white/60">Campus Event</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#0F0F1A]/75 backdrop-blur px-2.5 py-1 text-xs font-medium text-[#F59E0B] border border-[#F59E0B]/40">
                    <Flame className="h-3 w-3" />
                    Trending
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="font-semibold text-[#E5E7EB] line-clamp-1">{event.title}</h3>
                  <p className="text-xs text-[#9CA3AF] line-clamp-1">{event.club}</p>
                </div>
              </article>
            ))}
          </div>
          {!trendingLoading && trendingEvents.length === 0 && (
            <p className="text-center text-sm text-[#9CA3AF] mt-8">
              No approved events yet. Check back soon or sign in to explore the campus calendar.
            </p>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-8">
        <div className="container py-12 md:py-16">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#22D3EE]">
                  <GraduationCap className="h-5 w-5 text-white" />
                </span>
                <span className="text-lg font-bold text-[#E5E7EB]">CampusHub</span>
              </Link>
              <p className="text-sm text-[#9CA3AF] max-w-sm leading-relaxed">
                The modern way to discover, manage, and celebrate campus events — built for students, clubs, and
                administrators.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E5E7EB] mb-3">Platform</p>
              <ul className="space-y-2 text-sm text-[#9CA3AF]">
                <li>
                  <button type="button" onClick={scrollToEvents} className="hover:text-[#22D3EE] transition-colors">
                    Events
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                    className="hover:text-[#22D3EE] transition-colors"
                  >
                    Features
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E5E7EB] mb-3">Account</p>
              <ul className="space-y-2 text-sm text-[#9CA3AF]">
                <li>
                  <Link to="/login" className="hover:text-[#22D3EE] transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-[#22D3EE] transition-colors">
                    Sign up
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
            <p className="text-xs text-[#6B7280]">© {new Date().getFullYear()} CampusHub. All rights reserved.</p>
            <p className="text-xs text-[#6B7280]">Made for college campuses everywhere</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
