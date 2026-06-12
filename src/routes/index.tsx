import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, MessageCircle, Sparkles, Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Treatly - Turn Every Consultation Into a Yes" },
      {
        name: "description",
        content:
          "Treatly helps dental clinics create premium treatment proposals that patients understand, trust, and accept.",
      },
    ],
  }),
});

const logos = [
  "Lumine Dental",
  "Bosphorus Smile",
  "Meridian Clinic",
  "NovaDent",
  "Estetica Oral",
  "White Harbor",
  "DentAura",
  "Istanbul Care",
];

const oldWay = [
  "Patients leave with a plain PDF they never read.",
  "Treatment coordinators explain the same case over and over.",
  "High-value plans feel scary because financing is unclear.",
  "International patients miss nuance when proposals stay clinical.",
];

const newWay = [
  "Beautiful digital proposals patients can open on any device.",
  "AI rewrites technical language into confident, human explanations.",
  "Financing options turn large totals into manageable monthly plans.",
  "Patients can review, ask questions, and accept in one flow.",
];

const features = [
  {
    title: "Visual Plan Builder",
    text: "Assemble polished treatment plans with branded sections, clear procedures, and a patient-first presentation.",
    tag: "Core Workflow",
    tone: "blue",
    icon: "01",
  },
  {
    title: "AI Description Writer",
    text: "Translate clinical terminology into simple language that makes patients feel informed instead of overwhelmed.",
    tag: "AI-Powered",
    tone: "teal",
    icon: "02",
  },
  {
    title: "Financing Calculator",
    text: "Reframe total treatment value into monthly payments patients can understand on the spot.",
    tag: "Revenue Booster",
    tone: "gold",
    icon: "03",
  },
  {
    title: "Before and After Stories",
    text: "Show real case outcomes and build trust with transformation-focused proposal sections.",
    tag: "Trust Builder",
    tone: "coral",
    icon: "04",
  },
  {
    title: "WhatsApp and Email Delivery",
    text: "Send proposals instantly and keep the conversation moving beyond the consultation room.",
    tag: "Delivery",
    tone: "purple",
    icon: "05",
  },
  {
    title: "Acceptance Analytics",
    text: "Track what gets accepted, what gets delayed, and where your clinic can improve proposal quality.",
    tag: "Intelligence",
    tone: "blue",
    icon: "06",
  },
];

const aiCards = [
  ["Highest Impact", "Patient Description Writer", "Turn complex clinical terms into language patients trust in seconds."],
  ["Top Used", "Smart Follow-up Generator", "Generate personalized follow-ups based on proposal content and patient context."],
  ["Revenue Impact", "Financing Advisor", "Recommend the best way to present payment options for higher acceptance."],
  ["Unique Feature", "Acceptance Score Predictor", "Score each proposal before sending and learn how to improve it."],
  ["Global Clinics", "Instant Translation", "Deliver proposals in 40+ languages for international patients."],
  ["Enterprise", "Revenue Intelligence Reports", "Find patterns in declined treatment plans and fix the leakage."],
];

const testimonials = [
  {
    quote:
      "Our acceptance rate jumped dramatically once patients stopped receiving dry PDFs and started seeing a real proposal experience.",
    author: "Dr. Deniz Karahan",
    clinic: "Lumine Dental, Istanbul",
    metric: "+109% acceptance rate",
    initials: "DK",
  },
  {
    quote:
      "The translation and mobile-first proposal flow helped us close international patients before they even arrived.",
    author: "Anna Szabo",
    clinic: "Budapest Smile Clinic",
    metric: "+43% remote bookings",
    initials: "AS",
  },
  {
    quote:
      "Financing presentation changed everything. Patients suddenly saw possibility instead of one intimidating number.",
    author: "Dr. Miguel Reyes",
    clinic: "Centro Dental Meridian, Madrid",
    metric: "+28% average case value",
    initials: "MR",
  },
];

const pricing = [
  {
    name: "Starter",
    monthly: "$79",
    annual: "$66",
    description: "For solo practitioners getting started with visual treatment plans.",
    cta: "Get Started Free",
    featured: false,
    features: [
      "30 proposals per month",
      "1 coordinator seat",
      "Plan builder and 20 templates",
      "Before and after photo system",
      "Basic financing calculator",
      "Email delivery and tracking",
    ],
  },
  {
    name: "Professional",
    monthly: "$199",
    annual: "$165",
    description: "For growing clinics serious about maximizing treatment acceptance.",
    cta: "Start Free Trial",
    featured: true,
    features: [
      "Unlimited proposals",
      "3 coordinator seats",
      "AI description writer",
      "AI follow-up generator",
      "WhatsApp delivery",
      "40+ language translation",
      "Full analytics dashboard",
      "Custom clinic branding",
      "Priority support",
    ],
  },
  {
    name: "Clinic Pro",
    monthly: "$399",
    annual: "$332",
    description: "For multi-location clinics and dental groups requiring full power.",
    cta: "Contact Sales",
    featured: false,
    features: [
      "Everything in Professional",
      "10 coordinator seats",
      "AI acceptance predictor",
      "Revenue intelligence reports",
      "Multi-location management",
      "CRM integrations",
      "API access",
      "Dedicated onboarding",
    ],
  },
];

function LandingPage() {
  const [annual, setAnnual] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll(".reveal, .stagger-children"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{landingStyles}</style>
      <div className="treatly-shell">
        <nav className={scrolled ? "tl-nav scrolled" : "tl-nav"} id="nav">
          <a className="tl-nav-logo" href="#top">
            <span className="tl-nav-mark">
              <Sparkles size={16} />
            </span>
            <span className="tl-nav-text">Treatly</span>
          </a>

          <div className="tl-nav-links">
            <a href="#features">Features</a>
            <a href="#preview">Preview</a>
            <a href="#ai-section">AI</a>
            <a href="#pricing">Pricing</a>
          </div>

          <div className="tl-nav-actions">
            <Link className="tl-btn tl-btn-primary" to="/clinic/login">
              Start Free Trial
            </Link>
          </div>
        </nav>

        <header className="tl-hero" id="top">
          <div className="tl-hero-bg" />
          <div className="tl-hero-grid" />

          <div className="tl-hero-content">
            <div className="tl-badge">
              <span className="tl-badge-dot" />
              Premium proposals for modern dental clinics
            </div>

            <h1>
              Turn every consultation
              <br />
              into a confident <em>yes</em>.
            </h1>

            <p className="tl-hero-sub">
              Treatly helps clinics present treatment plans as a premium digital experience
              patients can understand, trust, and accept from any device.
            </p>

            <div className="tl-hero-ctas">
              <Link className="tl-btn tl-btn-hero" to="/clinic/login">
                Start Free
                <ArrowRight size={16} />
              </Link>
              <a className="tl-btn tl-btn-hero-ghost" href="#preview">
                See Proposal Preview
              </a>
            </div>

            <p className="tl-hero-note">
              Built for treatment coordinators, clinic owners, and sales-focused dental teams.
            </p>
          </div>

          <div className="tl-mockup reveal">
            <div className="tl-mockup-glow" />
            <div className="tl-mockup-frame">
              <div className="tl-mockup-bar">
                <span />
                <span />
                <span />
                <div className="tl-mockup-title">treatly.app / dashboard</div>
              </div>

              <div className="tl-mockup-body">
                <aside className="tl-m-sidebar">
                  <div className="tl-m-sidebar-header">Workspace</div>
                  {["Dashboard", "Proposals", "Patients", "Payments", "Analytics"].map((item, index) => (
                    <div className={index === 1 ? "tl-m-nav-item active" : "tl-m-nav-item"} key={item}>
                      <span className="tl-m-nav-dot" />
                      {item}
                    </div>
                  ))}
                </aside>

                <div className="tl-m-main">
                  <div className="tl-m-header">
                    <div className="tl-m-title">Proposal pipeline</div>
                    <button className="tl-mini-btn" type="button">
                      New Proposal
                    </button>
                  </div>

                  <div className="tl-m-stats">
                    <div className="tl-m-stat">
                      <div className="tl-m-stat-label">Accepted</div>
                      <div className="tl-m-stat-value">71%</div>
                      <div className="tl-m-stat-change">+12% this month</div>
                    </div>
                    <div className="tl-m-stat">
                      <div className="tl-m-stat-label">Open value</div>
                      <div className="tl-m-stat-value">$42k</div>
                      <div className="tl-m-stat-change">18 active cases</div>
                    </div>
                    <div className="tl-m-stat">
                      <div className="tl-m-stat-label">Follow-ups</div>
                      <div className="tl-m-stat-value">26</div>
                      <div className="tl-m-stat-change">AI ready</div>
                    </div>
                  </div>

                  <div className="tl-m-proposals">
                    {[
                      ["Sofia Ramos", "Smile makeover proposal", "$7,400", "Accepted"],
                      ["Murat Kaya", "Implant reconstruction plan", "$12,600", "Sent"],
                      ["Nina Petrova", "Whitening + veneers", "$4,900", "Pending"],
                    ].map(([name, procedure, amount, status]) => (
                      <div className="tl-m-row" key={name}>
                        <div className="tl-m-avatar">{name.slice(0, 1)}</div>
                        <div className="tl-m-info">
                          <div className="tl-m-name">{name}</div>
                          <div className="tl-m-procedure">{procedure}</div>
                        </div>
                        <div className="tl-m-amount">{amount}</div>
                        <div className={`tl-status ${status.toLowerCase()}`}>{status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="tl-logos">
          <div className="tl-logos-label">Trusted by ambitious clinics worldwide</div>
          <div className="tl-logos-marquee">
            <div className="tl-logos-track">
              {[...logos, ...logos].map((logo, index) => (
                <span className="tl-logo-item" key={`${logo}-${index}`}>
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="tl-section tl-problem">
          <div className="tl-container">
            <div className="section-eyebrow reveal">Why Treatly</div>
            <h2 className="section-title reveal">
              Stop sending treatment plans that feel
              <br />
              like <em>homework.</em>
            </h2>
            <p className="section-sub reveal">
              Most clinics invest heavily in diagnosis and case presentation, then lose momentum
              with a flat handoff. Treatly keeps the emotional confidence alive after the consult.
            </p>

            <div className="tl-problem-grid stagger-children">
              <div className="tl-problem-card old">
                <div className="tl-problem-label">The old way</div>
                {oldWay.map((item) => (
                  <div className="tl-problem-item" key={item}>
                    <span className="tl-problem-icon">-</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>

              <div className="tl-problem-card new">
                <div className="tl-problem-label">The Treatly way</div>
                {newWay.map((item) => (
                  <div className="tl-problem-item" key={item}>
                    <span className="tl-problem-icon">+</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="tl-section tl-features" id="features">
          <div className="tl-container">
            <div className="section-eyebrow reveal">Platform Highlights</div>
            <h2 className="section-title reveal">
              The system behind higher
              <br />
              <em>treatment acceptance.</em>
            </h2>
            <p className="section-sub reveal">
              Treatly combines proposal design, financial framing, follow-up, and analytics in one
              premium workflow built for dental teams.
            </p>

            <div className="tl-features-grid stagger-children">
              {features.map((feature) => (
                <article className="tl-feature-card" key={feature.title}>
                  <div className={`tl-feature-icon ${feature.tone}`}>{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <span className={`tl-feature-tag ${feature.tone}`}>{feature.tag}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="tl-section tl-preview" id="preview">
          <div className="tl-container tl-preview-inner">
            <div>
              <div className="section-eyebrow reveal">The Patient Experience</div>
              <h2 className="section-title reveal">
                Proposals your patients will
                <br />
                actually <em>read.</em>
              </h2>
              <p className="section-sub reveal">
                Every proposal becomes a branded digital journey instead of another attachment.
                Patients can review treatment, compare pricing, and accept with one tap.
              </p>

              <div className="tl-check-list reveal">
                <div className="tl-check-item">
                  <div className="tl-check-mark">
                    <Check size={16} />
                  </div>
                  <div>
                    <strong>One-click acceptance</strong>
                    <p>Patients accept directly from the proposal without printing or callbacks.</p>
                  </div>
                </div>
                <div className="tl-check-item">
                  <div className="tl-check-mark">
                    <MessageCircle size={16} />
                  </div>
                  <div>
                    <strong>Mobile-first review</strong>
                    <p>Designed for phones first, where many treatment decisions really happen.</p>
                  </div>
                </div>
                <div className="tl-check-item">
                  <div className="tl-check-mark">
                    <Wand2 size={16} />
                  </div>
                  <div>
                    <strong>Embedded AI guidance</strong>
                    <p>Help patients understand procedures with clearer language and instant answers.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="tl-preview-card-wrap reveal">
              <div className="tl-preview-badge">Accepted</div>
              <div className="tl-preview-card">
                <div className="tl-preview-head">
                  <div className="tl-preview-clinic">Lumine Dental - Istanbul</div>
                  <div className="tl-preview-title">Your Smile Makeover Plan</div>
                  <div className="tl-preview-patient">Prepared for Sofia Ramos - April 2025</div>
                </div>
                <div className="tl-preview-body">
                  {[
                    ["Porcelain Veneers x6", "Ultra-thin ceramic shells for a natural smile", "$6,000"],
                    ["Professional Whitening", "In-clinic whitening for a brighter finish", "$800"],
                    ["Digital Smile Design", "Preview the final result before treatment starts", "$600"],
                  ].map(([name, desc, price]) => (
                    <div className="tl-preview-procedure" key={name}>
                      <div className="tl-preview-proc-icon" />
                      <div>
                        <div className="tl-preview-proc-name">{name}</div>
                        <div className="tl-preview-proc-desc">{desc}</div>
                      </div>
                      <div className="tl-preview-proc-price">{price}</div>
                    </div>
                  ))}
                </div>
                <div className="tl-preview-footer">
                  <div>
                    <div className="tl-preview-total-label">Total investment</div>
                    <div className="tl-preview-total">$7,400</div>
                    <div className="tl-preview-installment">or from $189/month</div>
                  </div>
                  <button className="tl-preview-cta" type="button">
                    Accept Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tl-section tl-ai" id="ai-section">
          <div className="tl-container">
            <div className="section-eyebrow reveal">Intelligence Layer</div>
            <h2 className="section-title reveal">
              AI that speaks patient,
              <br />
              not <em>clinical.</em>
            </h2>
            <p className="section-sub reveal">
              Treatly does more than automate. It helps your clinic explain, present, and follow up
              in a way that makes patients feel ready.
            </p>

            <div className="tl-ai-grid stagger-children">
              {aiCards.map(([pill, title, text]) => (
                <article className="tl-ai-card" key={title}>
                  <span className="tl-ai-pill">{pill}</span>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="tl-section tl-testimonials" id="testimonials">
          <div className="tl-container">
            <div className="section-eyebrow reveal">Real Results</div>
            <h2 className="section-title reveal">
              Clinics that said <em>yes</em>
              <br />
              to Treatly.
            </h2>

            <div className="tl-testi-grid stagger-children">
              {testimonials.map((item) => (
                <article className="tl-testi-card" key={item.author}>
                  <div className="tl-stars">5.0</div>
                  <p className="tl-testi-quote">"{item.quote}"</p>
                  <div className="tl-testi-author">
                    <div className="tl-testi-avatar">{item.initials}</div>
                    <div>
                      <div className="tl-testi-name">{item.author}</div>
                      <div className="tl-testi-clinic">{item.clinic}</div>
                    </div>
                  </div>
                  <span className="tl-testi-metric">{item.metric}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="tl-section tl-pricing" id="pricing">
          <div className="tl-container">
            <div className="section-eyebrow reveal centered">Pricing</div>
            <h2 className="section-title reveal centered">
              One accepted case
              <br />
              pays for a <em>year.</em>
            </h2>

            <div className="tl-pricing-toggle reveal">
              <span>Monthly</span>
              <button
                aria-label="Toggle annual pricing"
                className={annual ? "tl-toggle on" : "tl-toggle off"}
                onClick={() => setAnnual((value) => !value)}
                type="button"
              >
                <span />
              </button>
              <span>Annual</span>
              <span className="tl-savings">Save 2 months</span>
            </div>

            <div className="tl-pricing-grid stagger-children">
              {pricing.map((plan) => (
                <article className={plan.featured ? "tl-price-card featured" : "tl-price-card"} key={plan.name}>
                  {plan.featured ? <div className="tl-popular-badge">Most Popular</div> : null}
                  <div className="tl-plan-name">{plan.name}</div>
                  <div className="tl-plan-price">
                    <span className="amount">{annual ? plan.annual : plan.monthly}</span>
                    <span className="period">/month</span>
                  </div>
                  <p className="tl-plan-desc">{plan.description}</p>
                  <ul className="tl-plan-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <button className={plan.featured ? "tl-plan-cta solid" : "tl-plan-cta ghost"} type="button">
                    {plan.cta}
                  </button>
                </article>
              ))}
            </div>

            <p className="tl-pricing-note reveal">
              All plans include a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>
        </section>

        <section className="tl-section tl-cta">
          <div className="tl-container">
            <div className="reveal tl-cta-panel">
              <h2>
                Your next patient deserves
                <br />
                a confident <em>yes.</em>
              </h2>
              <p>
                Join clinics already closing more cases with a better proposal experience.
                Build your first plan in minutes.
              </p>
              <Link className="tl-btn tl-btn-hero" to="/clinic/login">
                Start Free - No Card Needed
                <ArrowRight size={16} />
              </Link>
              <div className="tl-trust-row">
                <span>14-day free trial</span>
                <span>Setup in under 10 minutes</span>
                <span>No credit card required</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="tl-footer">
          <div className="tl-container">
            <div className="tl-footer-top">
              <div>
                <div className="tl-footer-logo">Treatly</div>
                <p className="tl-footer-about">
                  The premium treatment presentation platform for dental clinics that want patients
                  to understand value and say yes with confidence.
                </p>
              </div>
              <div>
                <div className="tl-footer-col-title">Product</div>
                <ul className="tl-footer-links">
                  <li><a href="#features">Features</a></li>
                  <li><a href="#preview">Plan Builder</a></li>
                  <li><a href="#ai-section">AI Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                </ul>
              </div>
              <div>
                <div className="tl-footer-col-title">Company</div>
                <ul className="tl-footer-links">
                  <li><a href="#top">About</a></li>
                  <li><a href="#testimonials">Case Studies</a></li>
                  <li><a href="/admin/login">Admin</a></li>
                  <li><a href="/clinic/login">Clinics</a></li>
                </ul>
              </div>
              <div>
                <div className="tl-footer-col-title">Resources</div>
                <ul className="tl-footer-links">
                  <li><a href="#preview">Preview</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#ai-section">AI</a></li>
                  <li><a href="#features">Workflow</a></li>
                </ul>
              </div>
            </div>

            <div className="tl-footer-bottom">
              <span>Copyright 2026 Treatly. All rights reserved.</span>
              <div className="tl-footer-meta">
                <a href="#top">Privacy Policy</a>
                <a href="#top">Terms of Service</a>
                <a href="#top">Cookie Policy</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

const landingStyles = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

.treatly-shell {
  --navy: #0d1520;
  --navy2: #111c2e;
  --navy3: #162038;
  --blue: #2563eb;
  --blue-l: #3b82f6;
  --teal: #2dd4a7;
  --teal-d: #1a9e7e;
  --gold: #c9a84c;
  --coral: #e85d6b;
  --text: #eef2f7;
  --muted: #8898b3;
  --muted2: #5a6e8a;
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.1);
  background: var(--navy);
  color: var(--text);
  font-family: "DM Sans", system-ui, sans-serif;
  overflow-x: hidden;
}

.treatly-shell * { box-sizing: border-box; }
.treatly-shell a { text-decoration: none; }
.treatly-shell em { color: var(--teal); font-style: italic; }
.tl-container { max-width: 1100px; margin: 0 auto; }

.tl-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  transition: background .3s ease, border-color .3s ease, backdrop-filter .3s ease;
}

.tl-nav.scrolled {
  background: rgba(13,21,32,0.82);
  border-bottom: 1px solid var(--border2);
  backdrop-filter: blur(18px);
}

.tl-nav-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
}

.tl-nav-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--blue), var(--teal));
  color: white;
}

.tl-nav-text {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 22px;
}

.tl-nav-links,
.tl-nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tl-nav-links a {
  color: var(--muted);
  font-size: 14px;
  padding: 8px 14px;
  border-radius: 999px;
  transition: .2s ease;
}

.tl-nav-links a:hover {
  color: var(--text);
  background: rgba(255,255,255,0.05);
}

.tl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  font-weight: 600;
  transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
}

.tl-btn:hover { transform: translateY(-1px); }

.tl-btn-ghost {
  color: var(--muted);
  border: 1px solid var(--border2);
  padding: 10px 18px;
}

.tl-btn-ghost:hover {
  color: var(--text);
  background: rgba(255,255,255,0.05);
}

.tl-btn-primary {
  color: white;
  background: var(--blue);
  padding: 10px 18px;
  box-shadow: 0 10px 30px rgba(37,99,235,0.25);
}

.tl-btn-primary:hover,
.tl-btn-hero:hover,
.tl-preview-cta:hover,
.tl-mini-btn:hover {
  box-shadow: 0 14px 40px rgba(37,99,235,0.35);
}

.tl-hero {
  min-height: 100vh;
  position: relative;
  padding: 140px 24px 90px;
  text-align: center;
}

.tl-hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37,99,235,0.16) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 84% 80%, rgba(45,212,167,0.08) 0%, transparent 60%),
    radial-gradient(ellipse 40% 50% at 20% 60%, rgba(13,32,56,0.6) 0%, transparent 70%);
}

.tl-hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 80%);
}

.tl-hero-content,
.tl-mockup {
  position: relative;
  z-index: 1;
}

.tl-hero-content {
  max-width: 840px;
  margin: 0 auto;
}

.tl-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--teal);
  background: rgba(45,212,167,0.1);
  border: 1px solid rgba(45,212,167,0.2);
  padding: 8px 16px;
  border-radius: 999px;
  margin-bottom: 28px;
}

.tl-badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--teal);
  animation: tlPulse 2s infinite;
}

.tl-hero h1 {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(46px, 8vw, 86px);
  line-height: 1.03;
  letter-spacing: -0.03em;
  margin: 0 0 20px;
}

.tl-hero-sub {
  max-width: 620px;
  margin: 0 auto 34px;
  color: var(--muted);
  font-size: clamp(16px, 2.1vw, 20px);
  line-height: 1.7;
}

.tl-hero-ctas {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tl-btn-hero,
.tl-btn-hero-ghost {
  padding: 15px 28px;
  border-radius: 12px;
  font-size: 16px;
}

.tl-btn-hero {
  color: white;
  background: linear-gradient(135deg, var(--blue), #1d4ed8);
  box-shadow: 0 10px 30px rgba(37,99,235,0.3);
}

.tl-btn-hero-ghost {
  color: var(--text);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border2);
}

.tl-hero-note {
  margin-top: 16px;
  color: var(--muted2);
  font-size: 13px;
}

.tl-mockup {
  max-width: 940px;
  margin: 72px auto 0;
}

.tl-mockup-glow {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 300px;
  background: radial-gradient(ellipse, rgba(37,99,235,0.3) 0%, transparent 70%);
}

.tl-mockup-frame {
  position: relative;
  background: rgba(17,28,46,0.92);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  box-shadow: 0 40px 120px rgba(0,0,0,0.6);
}

.tl-mockup-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.03);
}

.tl-mockup-bar span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.tl-mockup-bar span:nth-child(1) { background: #ff5f57; }
.tl-mockup-bar span:nth-child(2) { background: #ffbd2e; }
.tl-mockup-bar span:nth-child(3) { background: #28c840; }

.tl-mockup-title {
  flex: 1;
  text-align: center;
  color: var(--muted2);
  font-size: 12px;
  font-family: "DM Mono", monospace;
}

.tl-mockup-body {
  display: flex;
  gap: 24px;
  padding: 28px 32px;
}

.tl-m-sidebar {
  width: 190px;
  flex-shrink: 0;
}

.tl-m-sidebar-header {
  color: var(--muted2);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .12em;
  margin-bottom: 10px;
  padding: 0 10px;
}

.tl-m-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13px;
}

.tl-m-nav-item.active,
.tl-m-nav-item:hover {
  background: rgba(255,255,255,0.06);
  color: var(--text);
}

.tl-m-nav-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: .55;
}

.tl-m-main { flex: 1; min-width: 0; }

.tl-m-header,
.tl-preview-footer,
.tl-footer-bottom,
.tl-footer-top {
  display: flex;
  justify-content: space-between;
}

.tl-m-header {
  align-items: center;
  margin-bottom: 18px;
}

.tl-m-title {
  font-size: 16px;
  font-weight: 600;
}

.tl-mini-btn,
.tl-preview-cta {
  border: none;
  color: white;
  background: var(--blue);
  font: inherit;
  cursor: pointer;
}

.tl-mini-btn {
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
}

.tl-m-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.tl-m-stat,
.tl-m-row,
.tl-feature-card,
.tl-ai-card,
.tl-testi-card,
.tl-price-card,
.tl-problem-card {
  border: 1px solid var(--border);
}

.tl-m-stat {
  background: rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 14px 16px;
}

.tl-m-stat-label {
  color: var(--muted2);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  margin-bottom: 4px;
}

.tl-m-stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.tl-m-stat-change {
  margin-top: 6px;
  color: var(--teal);
  font-size: 11px;
}

.tl-m-proposals {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tl-m-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  padding: 12px 14px;
}

.tl-m-avatar,
.tl-testi-avatar {
  display: grid;
  place-items: center;
  font-weight: 700;
  flex-shrink: 0;
}

.tl-m-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(37,99,235,0.35), rgba(45,212,167,0.25));
}

.tl-m-info { flex: 1; min-width: 0; }
.tl-m-name { font-size: 13px; font-weight: 600; }
.tl-m-procedure { font-size: 11px; color: var(--muted); }
.tl-m-amount { font-family: "DM Mono", monospace; font-size: 13px; }

.tl-status {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  font-weight: 700;
}

.tl-status.accepted { color: var(--teal); background: rgba(45,212,167,0.12); }
.tl-status.sent { color: var(--blue-l); background: rgba(37,99,235,0.15); }
.tl-status.pending { color: var(--gold); background: rgba(201,168,76,0.12); }

.tl-logos {
  padding: 44px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.tl-logos-label {
  text-align: center;
  color: var(--muted2);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.tl-logos-marquee { overflow: hidden; }

.tl-logos-track {
  display: flex;
  gap: 60px;
  width: max-content;
  animation: tlMarquee 26s linear infinite;
}

.tl-logo-item {
  color: var(--muted2);
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 20px;
  white-space: nowrap;
}

.tl-section {
  position: relative;
  padding: 120px 32px;
}

.tl-problem { background: var(--navy); }
.tl-features { background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(22,32,56,0.85) 0%, var(--navy) 70%); }
.tl-preview { background: var(--navy2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }

.section-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--teal);
  margin-bottom: 18px;
}

.section-eyebrow::before {
  content: "";
  width: 20px;
  height: 1px;
  background: var(--teal);
}

.section-eyebrow.centered {
  width: 100%;
  justify-content: center;
}

.section-title {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin: 0 0 16px;
}

.section-title.centered,
.tl-pricing-note {
  text-align: center;
}

.section-sub {
  color: var(--muted);
  max-width: 580px;
  font-size: 18px;
  line-height: 1.7;
}

.tl-problem-grid,
.tl-preview-inner,
.tl-footer-top {
  display: grid;
  gap: 24px;
}

.tl-problem-grid {
  margin-top: 56px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tl-problem-card {
  border-radius: 16px;
  padding: 28px 32px;
}

.tl-problem-card.old { background: rgba(255,255,255,0.02); }

.tl-problem-card.new {
  background: rgba(37,99,235,0.06);
  border-color: rgba(37,99,235,0.2);
}

.tl-problem-label {
  margin-bottom: 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.old .tl-problem-label { color: var(--coral); }
.new .tl-problem-label { color: var(--teal); }

.tl-problem-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.tl-problem-item:last-child { border-bottom: none; }
.tl-problem-icon { color: var(--teal); font-weight: 700; }
.tl-problem-item p { color: var(--muted); font-size: 14px; line-height: 1.6; }

.tl-features-grid,
.tl-ai-grid,
.tl-testi-grid,
.tl-pricing-grid {
  display: grid;
  margin-top: 60px;
}

.tl-features-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.tl-ai-grid,
.tl-testi-grid,
.tl-pricing-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }

.tl-feature-card,
.tl-ai-card,
.tl-testi-card,
.tl-price-card {
  background: rgba(255,255,255,0.03);
  border-radius: 16px;
  padding: 28px;
}

.tl-feature-card {
  transition: transform .22s ease, background .22s ease, border-color .22s ease;
}

.tl-feature-card:hover {
  transform: translateY(-4px);
  background: rgba(255,255,255,0.05);
  border-color: rgba(45,212,167,0.25);
}

.tl-feature-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  font-size: 13px;
  font-family: "DM Mono", monospace;
  font-weight: 700;
}

.tl-feature-icon.blue,
.tl-feature-tag.blue { background: rgba(37,99,235,0.12); color: #60a5fa; }
.tl-feature-icon.teal,
.tl-feature-tag.teal { background: rgba(45,212,167,0.12); color: var(--teal); }
.tl-feature-icon.gold,
.tl-feature-tag.gold { background: rgba(201,168,76,0.12); color: var(--gold); }
.tl-feature-icon.coral,
.tl-feature-tag.coral { background: rgba(232,93,107,0.12); color: var(--coral); }
.tl-feature-icon.purple,
.tl-feature-tag.purple { background: rgba(139,92,246,0.12); color: #b69cff; }

.tl-feature-card h3,
.tl-ai-card h4 {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
}

.tl-feature-card p,
.tl-ai-card p,
.tl-testi-quote,
.tl-plan-desc {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}

.tl-feature-tag,
.tl-ai-pill,
.tl-testi-metric {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  margin-top: 16px;
}

.tl-preview-inner {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 76px;
}

.tl-check-list {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tl-check-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.tl-check-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(45,212,167,0.1);
  border: 1px solid rgba(45,212,167,0.2);
  color: var(--teal);
  flex-shrink: 0;
}

.tl-check-item strong {
  display: block;
  margin-bottom: 3px;
  font-size: 15px;
}

.tl-check-item p { color: var(--muted); font-size: 13px; line-height: 1.65; }

.tl-preview-card-wrap { position: relative; }

.tl-preview-badge {
  position: absolute;
  top: -12px;
  right: 24px;
  z-index: 2;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--teal), var(--teal-d));
  color: #062d25;
  font-size: 12px;
  font-weight: 800;
}

.tl-preview-card {
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(145deg, #f9f6f0, #eee8de);
  box-shadow: 0 40px 80px rgba(0,0,0,0.45);
  color: #1a2b5c;
  transform: perspective(1000px) rotateY(-4deg) rotateX(2deg);
  transition: transform .35s ease;
}

.tl-preview-card:hover { transform: perspective(1000px) rotateY(-1deg) rotateX(.5deg); }

.tl-preview-head {
  padding: 24px 28px;
  background: linear-gradient(135deg, #1a2b5c, #2563eb);
  color: white;
}

.tl-preview-clinic,
.tl-preview-patient,
.tl-preview-total-label {
  font-size: 12px;
  opacity: .78;
}

.tl-preview-title {
  margin-top: 4px;
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 30px;
  line-height: 1.08;
}

.tl-preview-body { padding: 24px 28px; }

.tl-preview-procedure {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.tl-preview-procedure:last-child { border-bottom: none; }

.tl-preview-proc-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #dceafd, #cae8df);
  flex-shrink: 0;
}

.tl-preview-proc-name {
  font-size: 14px;
  font-weight: 700;
}

.tl-preview-proc-desc {
  margin-top: 2px;
  color: #6b7280;
  font-size: 11px;
}

.tl-preview-proc-price {
  margin-left: auto;
  font-family: "DM Mono", monospace;
  font-size: 14px;
  font-weight: 700;
}

.tl-preview-footer {
  align-items: center;
  gap: 16px;
  padding: 22px 28px;
  background: #f0ebe3;
}

.tl-preview-total {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 30px;
}

.tl-preview-installment {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.tl-preview-cta {
  border-radius: 12px;
  padding: 12px 18px;
  font-weight: 700;
}

.tl-ai { background: linear-gradient(180deg, var(--navy), #0b1320); }
.tl-ai-pill { background: rgba(45,212,167,0.1); color: var(--teal); }

.tl-testimonials { background: var(--navy); }

.tl-testi-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tl-stars {
  color: var(--gold);
  font-weight: 800;
  margin-bottom: 16px;
}

.tl-testi-quote {
  flex: 1;
  margin: 0 0 22px;
  font-size: 15px;
}

.tl-testi-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tl-testi-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(37,99,235,0.2), rgba(45,212,167,0.15));
}

.tl-testi-name { font-size: 14px; font-weight: 700; }
.tl-testi-clinic { color: var(--muted); font-size: 12px; }
.tl-testi-metric { color: var(--teal); background: rgba(45,212,167,0.1); }

.tl-pricing { background: radial-gradient(ellipse at top, rgba(22,32,56,0.7) 0%, var(--navy) 70%); }

.tl-pricing-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

.tl-toggle {
  width: 62px;
  height: 34px;
  padding: 4px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
}

.tl-toggle span {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: white;
  transition: transform .2s ease;
}

.tl-toggle.on {
  background: linear-gradient(135deg, var(--blue), var(--teal));
}

.tl-toggle.on span { transform: translateX(28px); }

.tl-savings {
  color: #062d25;
  background: linear-gradient(135deg, var(--teal), #7ef0cf);
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.tl-price-card {
  position: relative;
  display: flex;
  flex-direction: column;
}

.tl-price-card.featured {
  background: linear-gradient(180deg, rgba(37,99,235,0.15), rgba(255,255,255,0.04));
  border-color: rgba(37,99,235,0.28);
  transform: translateY(-8px);
}

.tl-popular-badge {
  position: absolute;
  top: -12px;
  left: 28px;
  padding: 7px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--blue), var(--teal));
  color: white;
  font-size: 11px;
  font-weight: 800;
}

.tl-plan-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 10px;
}

.tl-plan-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.tl-plan-price .amount {
  font-size: 44px;
  line-height: 1;
  font-family: "Instrument Serif", Georgia, serif;
}

.tl-plan-price .period { color: var(--muted); }
.tl-plan-desc { margin-bottom: 18px; }

.tl-plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tl-plan-features li {
  color: var(--text);
  font-size: 14px;
  padding-left: 18px;
  position: relative;
}

.tl-plan-features li::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--teal);
  position: absolute;
  left: 0;
  top: 8px;
}

.tl-plan-cta {
  margin-top: auto;
  border-radius: 12px;
  padding: 14px 16px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.tl-plan-cta.solid {
  color: white;
  background: linear-gradient(135deg, var(--blue), #1d4ed8);
  border: none;
}

.tl-plan-cta.ghost {
  color: var(--text);
  background: transparent;
  border: 1px solid var(--border2);
}

.tl-pricing-note {
  margin-top: 32px;
  color: var(--muted2);
  font-size: 13px;
}

.tl-cta {
  background:
    radial-gradient(ellipse 50% 80% at 50% 0%, rgba(45,212,167,0.08) 0%, transparent 60%),
    var(--navy);
}

.tl-cta-panel {
  text-align: center;
  padding: 34px 24px 0;
}

.tl-cta-panel h2 {
  margin: 0 0 18px;
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(36px, 5vw, 58px);
  line-height: 1.08;
}

.tl-cta-panel p {
  max-width: 650px;
  margin: 0 auto 28px;
  color: var(--muted);
  font-size: 18px;
  line-height: 1.7;
}

.tl-trust-row {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.tl-trust-row span {
  color: var(--muted);
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border2);
  background: rgba(255,255,255,0.04);
}

.tl-footer {
  padding: 32px;
  border-top: 1px solid var(--border);
}

.tl-footer-top {
  grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 28px;
  padding-bottom: 28px;
}

.tl-footer-logo {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 28px;
  margin-bottom: 10px;
}

.tl-footer-about,
.tl-footer-links a,
.tl-footer-bottom,
.tl-footer-meta a {
  color: var(--muted);
}

.tl-footer-about {
  max-width: 380px;
  font-size: 14px;
  line-height: 1.7;
}

.tl-footer-col-title {
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.tl-footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tl-footer-links a,
.tl-footer-meta a {
  transition: color .2s ease;
}

.tl-footer-links a:hover,
.tl-footer-meta a:hover { color: var(--text); }

.tl-footer-bottom {
  border-top: 1px solid var(--border);
  padding-top: 18px;
  font-size: 13px;
  align-items: center;
  gap: 12px;
}

.tl-footer-meta {
  display: flex;
  gap: 18px;
}

.reveal,
.stagger-children > * {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity .7s ease, transform .7s ease;
}

.visible.reveal,
.visible.stagger-children > * {
  opacity: 1;
  transform: translateY(0);
}

.visible.stagger-children > *:nth-child(2) { transition-delay: .08s; }
.visible.stagger-children > *:nth-child(3) { transition-delay: .16s; }
.visible.stagger-children > *:nth-child(4) { transition-delay: .24s; }
.visible.stagger-children > *:nth-child(5) { transition-delay: .32s; }
.visible.stagger-children > *:nth-child(6) { transition-delay: .40s; }

@keyframes tlPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .55; transform: scale(.8); }
}

@keyframes tlMarquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@media (max-width: 1024px) {
  .tl-preview-inner,
  .tl-problem-grid,
  .tl-features-grid,
  .tl-ai-grid,
  .tl-testi-grid,
  .tl-pricing-grid,
  .tl-footer-top {
    grid-template-columns: 1fr 1fr;
  }

  .tl-preview-inner { gap: 40px; }
  .tl-mockup-body { flex-direction: column; }
  .tl-m-sidebar { width: 100%; }
}

@media (max-width: 760px) {
  .tl-nav {
    padding: 0 16px;
    height: auto;
    min-height: 72px;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .tl-nav-links {
    order: 3;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .tl-nav-actions { width: 100%; justify-content: center; }

  .tl-section,
  .tl-footer,
  .tl-hero { padding-left: 18px; padding-right: 18px; }

  .tl-hero { padding-top: 150px; }

  .tl-preview-inner,
  .tl-problem-grid,
  .tl-features-grid,
  .tl-ai-grid,
  .tl-testi-grid,
  .tl-pricing-grid,
  .tl-footer-top {
    grid-template-columns: 1fr;
  }

  .tl-m-stats { grid-template-columns: 1fr; }
  .tl-m-row { flex-wrap: wrap; }
  .tl-preview-footer,
  .tl-footer-bottom { flex-direction: column; align-items: flex-start; }
  .tl-cta-panel { padding-left: 0; padding-right: 0; }
  .tl-footer-meta { flex-wrap: wrap; }
}
`;
