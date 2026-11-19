"""Builds the public, search-friendly pages of the ToySwap website.

Run by .github/workflows/website.yml:  python3 site/build.py <out_dir> <site_url> <apk_url>
Every page is plain HTML (readable by Google and AI tools without running JavaScript),
with its own title, description, canonical link, Open Graph tags and structured data.
"""
import json, os, shutil, sys
from urllib.parse import urlparse
from datetime import date
from html import escape

OUT, SITE, APK = sys.argv[1], sys.argv[2].rstrip('/'), sys.argv[3]
APP = SITE + '/app/'
HERE = os.path.dirname(os.path.abspath(__file__))
TODAY = date.today().isoformat()

ORG = {"@type": "Organization", "@id": SITE + "/#org", "name": "ToySwap", "url": SITE + "/", "logo": SITE + "/icon-512.png",
       "description": "ToySwap is a safe, parent-approved marketplace where kids sell and swap toys they have outgrown."}

# ---------- shared bits ----------
LOGO = '<svg width="40" height="40" viewBox="0 0 56 56" aria-hidden="true"><rect width="56" height="56" rx="18" fill="#C2410C"/><path d="M15 22 H39 M33 16 L39 22 L33 28 M41 34 H17 M23 28 L17 34 L23 40" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
TOY = {
 'bear': '<circle cx="34" cy="30" r="14" fill="#B45309"/><circle cx="34" cy="30" r="7" fill="#F59E0B"/><circle cx="86" cy="30" r="14" fill="#B45309"/><circle cx="86" cy="30" r="7" fill="#F59E0B"/><circle cx="60" cy="58" r="36" fill="#D97706"/><ellipse cx="60" cy="70" rx="16" ry="12" fill="#FDE68A"/><circle cx="47" cy="52" r="4" fill="#1C1A3A"/><circle cx="73" cy="52" r="4" fill="#1C1A3A"/><ellipse cx="60" cy="65" rx="5" ry="4" fill="#1C1A3A"/><path d="M54 74 Q60 79 66 74" stroke="#1C1A3A" stroke-width="2" fill="none" stroke-linecap="round"/>',
 'rocket': '<path d="M60 14 C76 28 80 48 78 76 H42 C40 48 44 28 60 14 Z" fill="#F8FAFC" stroke="#6D28D9" stroke-width="4"/><circle cx="60" cy="46" r="9" fill="#60A5FA" stroke="#6D28D9" stroke-width="4"/><path d="M42 62 L28 84 L42 80 Z" fill="#DC2626"/><path d="M78 62 L92 84 L78 80 Z" fill="#DC2626"/><path d="M50 78 L60 104 L70 78 Z" fill="#F59E0B"/>',
 'blocks': '<rect x="18" y="62" width="38" height="38" rx="6" fill="#DC2626"/><rect x="62" y="62" width="38" height="38" rx="6" fill="#2563EB"/><rect x="40" y="20" width="38" height="38" rx="6" fill="#16A34A"/><g font-family="Fredoka,sans-serif" font-weight="700" font-size="24" fill="#fff" text-anchor="middle"><text x="37" y="89">A</text><text x="81" y="89">B</text><text x="59" y="47">C</text></g>',
 'car': '<path d="M30 52 L44 36 H78 L92 52 Z" fill="#1D4ED8"/><rect x="16" y="52" width="88" height="26" rx="10" fill="#2563EB"/><rect x="48" y="40" width="12" height="12" fill="#BFDBFE"/><rect x="64" y="40" width="12" height="12" fill="#BFDBFE"/><circle cx="38" cy="80" r="11" fill="#1C1A3A"/><circle cx="82" cy="80" r="11" fill="#1C1A3A"/><circle cx="38" cy="80" r="4" fill="#E5E7EB"/><circle cx="82" cy="80" r="4" fill="#E5E7EB"/>',
 'robot': '<rect x="34" y="40" width="52" height="44" rx="10" fill="#94A3B8"/><rect x="42" y="50" width="36" height="20" rx="6" fill="#1E293B"/><circle cx="52" cy="60" r="4" fill="#60A5FA"/><circle cx="68" cy="60" r="4" fill="#60A5FA"/><path d="M60 40 V26" stroke="#64748B" stroke-width="4"/><circle cx="60" cy="24" r="5" fill="#DC2626"/><rect x="40" y="86" width="12" height="14" rx="3" fill="#64748B"/><rect x="68" y="86" width="12" height="14" rx="3" fill="#64748B"/><rect x="22" y="50" width="10" height="26" rx="5" fill="#64748B"/><rect x="88" y="50" width="10" height="26" rx="5" fill="#64748B"/>',
 'kite': '<path d="M60 12 L92 50 L60 94 L28 50 Z" fill="#F59E0B"/><path d="M60 12 L92 50 L60 50 Z" fill="#DC2626"/><path d="M60 50 L60 94 L28 50 Z" fill="#2563EB"/><path d="M60 12 V94 M28 50 H92" stroke="#7C2D12" stroke-width="2.5"/><path d="M60 94 Q48 102 60 108 Q72 114 62 120" stroke="#DC2626" stroke-width="3" fill="none"/>',
}
def toy(k, style, cls='float'):
    return f'<svg class="{cls}" style="{style}" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="110" rx="36" ry="6" fill="#1C1A3A" opacity=".13"/>{TOY[k]}</svg>'
TICK = '<span class="tick"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg></span>'
def ico(path, bg, fg):
    return f'<span class="ic" style="background:{bg};color:{fg}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{path}</svg></span>'
I_FAMILY = '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21c0-3.5 2.7-6 6-6s6 2.5 6 6M14 21c0-2.5 1.3-4.5 3-4.5s4 2 4 4.5"/>'
I_SHIELD = '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>'
I_CHAT = '<path d="M4 5h16v11H9l-5 4z"/>'
I_PIN = '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'
I_CARD = '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/>'
I_LEAF = '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l7-7"/>'

NAV = [('', 'Home'), ('parents/', 'For parents'), ('safety/', 'Safety'), ('faq/', 'FAQ')]

def page(path, title, desc, body, schema, active=''):
    depth = path.count('/')
    rel = '../' * depth
    url = SITE + '/' + path
    nav = ''.join(f'<a href="{rel}{p}"{" aria-current=\"page\"" if p == active else ""}>{l}</a>' for p, l in NAV)
    graph = json.dumps({"@context": "https://schema.org", "@graph": [ORG] + schema}, ensure_ascii=False, indent=1)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#FFD43B">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ToySwap">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ToySwap: kids sell and swap toys, parents approve every deal">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{escape(title)}">
<meta name="twitter:description" content="{escape(desc)}">
<meta name="twitter:image" content="{SITE}/og-image.png">
<link rel="icon" type="image/png" href="{rel}favicon.png">
<link rel="apple-touch-icon" href="{rel}icon-192.png">
<link rel="manifest" href="{rel}site.webmanifest">
<link rel="alternate" type="text/plain" title="ToySwap for AI assistants" href="{SITE}/llms.txt">
<link rel="sitemap" type="application/xml" href="{SITE}/sitemap.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{rel}styles.css">
<script type="application/ld+json">
{graph}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="logo" href="{rel}" aria-label="ToySwap home">{LOGO}ToySwap</a>
<nav class="nav" aria-label="Main">{nav}<a href="{APP}">Log in</a></nav>
</div></header>
<main id="main">
{body}
</main>
<footer><div class="wrap">
<div><a class="logo" href="{rel}" style="color:#fff">{LOGO}ToySwap</a><p style="margin-top:10px;font-weight:600;max-width:360px">A safe marketplace where kids sell and swap toys they’ve outgrown, and a parent approves every deal.</p></div>
<div><h3>ToySwap</h3><a href="{APP}">Open the web app</a><a href="{APK}">Get the Android app</a><a href="{rel}faq/">FAQ</a></div>
<div><h3>Families</h3><a href="{rel}parents/">For parents</a><a href="{rel}safety/">Safety rules</a><a href="{rel}safety/#care-promise">Care Promise</a></div>
<div><h3>How it works</h3><a href="{rel}#how-it-works">Selling a toy</a><a href="{rel}#swapping">Swapping</a><a href="{rel}parents/#payments">Payments</a></div>
<p class="copy">© {date.today().year} ToySwap. Made for kids and the grown-ups who look after them.</p>
</div></footer>
</body>
</html>
'''

def faq_html(items):
    return '<div class="faq">' + ''.join(f'<details><summary>{escape(q)}</summary><p>{escape(a)}</p></details>' for q, a in items) + '</div>'
def faq_schema(items, url):
    return {"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}

# ---------- content ----------
FAQ = [
 ("What is ToySwap?", "ToySwap is a safe marketplace for kids aged about 5 to 13. Kids list toys they have outgrown, then sell them for a small price or swap them for another kid’s toy. A parent sets up every kid account and approves every listing, purchase and swap."),
 ("Is ToySwap a marketplace or a shop?", "ToySwap is a peer-to-peer marketplace, not a shop. ToySwap does not own or sell any toys. Kids are the sellers and the buyers, and ToySwap connects them with safety rules and parent approval built in."),
 ("How does swapping a toy work?", "A kid picks a toy they like and offers one of their own listed toys in exchange. The other kid can accept or decline, and the swap only happens after both kids’ parents approve. No money changes hands in a swap."),
 ("Who approves a sale or a swap?", "Both families. A purchase or swap only goes ahead when the buyer’s parent and the seller’s parent both say yes in their parent dashboards. New listings and Toy Stories also need the kid’s own parent to approve them first."),
 ("Do kids pay with a card?", "No. Kids never type card details or handle money. After both parents approve a purchase, the buyer’s parent pays by card through Stripe, and the money goes to the seller’s parent’s bank account."),
 ("Can kids chat with strangers on ToySwap?", "No. There is no private chat. Kids can only send ready-made questions such as “Is this still available?” and ready-made answers, and Toy Stories use fixed messages that a parent checks before anyone sees them."),
 ("What information do other kids see?", "Only a nickname, an avatar and the number of trades. Real names, schools, addresses, emails and parents’ details are never shown to other kids."),
 ("How do kids hand over a toy?", "With a parent, either at a safe public place such as a library or mall, or by a delivery that a parent arranges. ToySwap never asks kids to meet anyone on their own."),
 ("What is the Care Promise?", "It is four promises every kid makes on their first log-in: play gently, keep toys clean, keep all the pieces together, and be kind and honest when trading. Before listing a toy, kids also complete a four-point care check."),
 ("How much does ToySwap cost?", "Joining ToySwap and listing toys is free. Kids set their own prices, usually a few dollars for a used toy, and swaps are always free."),
 ("Is there a ToySwap app?", "Yes. ToySwap works in any web browser and as an Android app you can download from this website. An iPhone version is planned."),
]

HOWTO_STEPS = [
 ("Check and list", "Clean the toy, make sure every piece is there, add a photo, and choose to sell it, swap it, or both."),
 ("A parent says yes", "The kid’s parent approves the listing from their dashboard, and the toy appears for other kids."),
 ("Agree a deal", "Another kid asks to buy or offers a swap. Both families’ parents approve it."),
 ("Hand it over", "Parents meet at a safe public place or arrange a delivery. For a sale, the buyer’s parent pays by card first."),
]

home_body = f'''
<div class="hero"><div class="wrap">
 <div>
  <h1>Sell and swap toys safely. Parents approve every deal.</h1>
  <p class="lead">ToySwap is a marketplace for kids. List the toys you’ve outgrown, sell them for a few dollars or swap them for something new, and learn to look after your things along the way.</p>
  <div class="row"><a class="btn" href="{APP}">Open ToySwap</a><a class="btn2" href="{APK}">Get the Android app</a></div>
  <small>Free to join. A parent creates the family account first.</small>
 </div>
 <div class="scene" aria-hidden="true">
  {toy("rocket","width:24%;right:14%;top:2%;--r:16deg;transform:rotate(16deg)")}
  {toy("kite","width:20%;left:10%;top:6%;--r:-10deg;transform:rotate(-10deg)")}
  <div class="shelf"></div>
  {toy("bear","width:32%;left:8%;bottom:19%","")}
  {toy("blocks","width:25%;left:40%;bottom:19%","")}
  {toy("robot","width:27%;right:7%;bottom:19%","")}
  {toy("car","width:24%;left:30%;bottom:-2%","")}
 </div>
</div></div>

<section id="how-it-works"><div class="wrap">
 <p class="kicker">How it works</p>
 <h2>From toy box to a new friend in four steps</h2>
 <div class="grid2">{"".join(f'<div class="card"><span class="n">{i+1}</span><h3>{escape(h)}</h3><p>{escape(b)}</p></div>' for i,(h,b) in enumerate(HOWTO_STEPS))}</div>
</div></section>

<section class="band" id="swapping"><div class="wrap">
 <p class="kicker">Why families use ToySwap</p>
 <h2>A marketplace built for kids, with grown-ups in charge</h2>
 <p class="sub">ToySwap is a peer-to-peer marketplace: kids are the sellers and the buyers. ToySwap doesn’t own any toys. It connects families and keeps every step safe.</p>
 <div class="grid3">
  <div class="card">{ico(I_FAMILY,"#DCFCE7","#166534")}<h3>Both parents approve</h3><p>Every sale and swap needs a yes from the buyer’s parent and the seller’s parent.</p></div>
  <div class="card">{ico(I_CHAT,"#FFF7D6","#713F12")}<h3>No private chat</h3><p>Kids use ready-made questions and answers only, so conversations stay friendly and safe.</p></div>
  <div class="card">{ico(I_SHIELD,"#DBEAFE","#1E3A8A")}<h3>Nicknames only</h3><p>Other kids see a nickname and an avatar. Never a real name, school or address.</p></div>
  <div class="card">{ico(I_CARD,"#FFE8D9","#9A3412")}<h3>Kids never pay</h3><p>The buyer’s parent pays by card through Stripe; the seller’s parent receives the money.</p></div>
  <div class="card">{ico(I_PIN,"#EDE9FE","#5B21B6")}<h3>Safe hand-overs</h3><p>Toys change hands with parents, at a public place or by a parent-arranged delivery.</p></div>
  <div class="card">{ico(I_LEAF,"#DCFCE7","#166534")}<h3>Swap, don’t waste</h3><p>Swapping gives toys a second playtime and keeps them out of the bin.</p></div>
 </div>
</div></section>

<section><div class="wrap">
 <div class="promise" id="care-promise">
  <div><p class="kicker" style="color:#166534">The Care Promise</p><h2 style="color:#14532D">Play as much as you like. Just look after it.</h2><p class="sub" style="color:#166534">Every kid makes four promises when they join, and completes a care check before listing a toy. Kids who list clean, complete toys earn a higher Care Score and badges like Toy Guardian.</p></div>
  <ul><li>{TICK}I’ll play as much as I like, but gently</li><li>{TICK}I’ll keep my toys clean</li><li>{TICK}I’ll keep all the pieces together</li><li>{TICK}I’ll be kind and honest when I trade</li></ul>
 </div>
</div></section>

<section class="band"><div class="wrap">
 <p class="kicker">Questions</p>
 <h2>Frequently asked questions</h2>
 {faq_html(FAQ[:6])}
 <p style="margin-top:18px;font-weight:800"><a href="faq/">See all questions</a></p>
</div></section>

<section><div class="wrap">
 <div class="cta"><div><h2>Ready to give your toys a second playtime?</h2><p>A parent creates the family account, then adds each kid with a nickname and password.</p></div>
 <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="{APP}">Create a family account</a><a class="btn green" href="{APK}">Get the Android app</a></div></div>
</div></section>
'''

home_schema = [
 {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "ToySwap", "publisher": {"@id": SITE + "/#org"}, "inLanguage": "en"},
 {"@type": "SoftwareApplication", "name": "ToySwap", "operatingSystem": "Android, Web", "applicationCategory": "ShoppingApplication",
  "description": "A parent-approved marketplace where kids sell and swap toys they have outgrown.", "url": APP, "downloadUrl": APK,
  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "publisher": {"@id": SITE + "/#org"}},
 {"@type": "HowTo", "name": "How to sell or swap a toy on ToySwap", "step": [{"@type": "HowToStep", "position": i + 1, "name": h, "text": b} for i, (h, b) in enumerate(HOWTO_STEPS)]},
 faq_schema(FAQ[:6], SITE + "/"),
]

def crumbs(name, path):
    return {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": name, "item": SITE + "/" + path}]}

parents_body = f'''
<div class="page-hero"><div class="wrap prose"><p class="crumb"><a href="../">Home</a> › For parents</p>
<h1>ToySwap for parents</h1><p>You stay in charge of everything your kids list, buy, swap and share. Here’s how the parent side works.</p></div></div>
<section><div class="wrap prose">
<h2>What does a parent do on ToySwap?</h2>
<p class="answer">A parent creates the family account with an email address, gives consent, and adds each kid with a nickname and password. After that, the parent approves or declines every listing, purchase, swap and Toy Story from the parent dashboard.</p>
<h2>Setting up your family</h2>
<ol><li>Create a family account with your name, email, password and country.</li><li>Open the parent dashboard and add a kid: a fun nickname (never a real name), a password, an avatar and an age group.</li><li>Your kid logs in on their own device with “I’m a Kid” and makes the Care Promise.</li></ol>
<h2>What you approve</h2>
<div class="scroll"><table><thead><tr><th>Request</th><th>Who approves</th><th>What happens next</th></tr></thead><tbody>
<tr><td>Listing a toy</td><td>Your kid’s parent</td><td>The toy appears for other kids; your kid’s Care Score goes up.</td></tr>
<tr><td>Buying a toy</td><td>Buyer’s parent and seller’s parent</td><td>The toy is held; the buyer’s parent pays by card.</td></tr>
<tr><td>Swapping toys</td><td>Both kids’ parents</td><td>The two toys change owners. No money moves.</td></tr>
<tr><td>Sharing a Toy Story</td><td>Your kid’s parent</td><td>The story becomes visible to other kids.</td></tr>
</tbody></table></div>
<h2>Rules you can set</h2>
<ul><li><strong>Can sell toys</strong>: on or off.</li><li><strong>Can swap toys</strong>: on or off.</li><li><strong>Spending limit</strong>: the most your kid can ask to spend on one toy ($2, $5, $10 or $20).</li></ul>
<h2 id="payments">How payments work</h2>
<p class="answer">Kids never handle money. When both families approve a purchase, the buyer’s parent pays by card through Stripe’s secure checkout. The money goes to the seller’s parent’s bank account through Stripe Connect, and counts toward the seller’s savings goal in the app.</p>
<p>To receive money from your kid’s sales, set up payouts once from the parent dashboard. ToySwap never sees your card number. Card payments depend on Stripe being available in your country; swaps work everywhere.</p>
<h2>Hand-overs</h2>
<p>Every hand-over happens with a parent: at a busy public place such as a library or shopping centre, or by a delivery you arrange. Kids are never asked to meet anyone alone.</p>
<p style="margin-top:28px"><a class="btn" href="{APP}">Create a family account</a></p>
</div></section>'''

safety_body = f'''
<div class="page-hero"><div class="wrap prose"><p class="crumb"><a href="../">Home</a> › Safety</p>
<h1>How ToySwap keeps kids safe</h1><p>Safety is built into ToySwap’s database, not just its screens, so the rules can’t be skipped.</p></div></div>
<section><div class="wrap prose">
<h2>Is ToySwap safe for kids?</h2>
<p class="answer">ToySwap is designed for kids with parents in control: a parent creates every kid account, both families approve every sale and swap, there is no private chat, other kids only see a nickname and avatar, kids never handle money, and toys are handed over with parents.</p>
<h2>Our safety rules</h2>
<ul>
<li><strong>Parent-created accounts.</strong> Kids can’t sign up on their own.</li>
<li><strong>Two-family approval.</strong> A purchase or swap needs a yes from both kids’ parents.</li>
<li><strong>No free-text chat.</strong> Questions, answers and Toy Stories come from fixed, friendly lists.</li>
<li><strong>Nicknames and avatars only.</strong> No real names, schools, addresses or photos of people.</li>
<li><strong>Hidden until approved.</strong> New listings and stories stay invisible to other kids until a parent approves them.</li>
<li><strong>No money for kids.</strong> Parents pay and get paid; kids never type card details.</li>
<li><strong>Safe hand-overs.</strong> With parents, at public places or by parent-arranged delivery.</li>
<li><strong>Photo rules.</strong> Photos show only the toy: no faces, uniforms or houses.</li>
</ul>
<h2 id="care-promise">The Care Promise</h2>
<p>Every kid makes four promises on their first log-in:</p>
<ol><li>I’ll play as much as I like, but gently.</li><li>I’ll keep my toys clean.</li><li>I’ll keep all the pieces together.</li><li>I’ll be kind and honest when I trade.</li></ol>
<p>Before listing a toy, kids complete a care check: it’s clean, all the pieces are there, nothing is broken, and it works.</p>
<h2>Something doesn’t feel right?</h2>
<p>Talk to a grown-up you trust. Parents can decline any request, change their kid’s rules, or remove a listing at any time.</p>
</div></section>'''

faq_body = f'''
<div class="page-hero"><div class="wrap prose"><p class="crumb"><a href="../">Home</a> › FAQ</p>
<h1>ToySwap FAQ</h1><p>Short answers to the questions families ask most.</p></div></div>
<section><div class="wrap">{faq_html(FAQ)}</div></section>'''

PAGES = [
 ('', 'ToySwap: Kids Sell and Swap Toys Safely, Parents Approve', 'ToySwap is a safe marketplace where kids sell and swap toys they’ve outgrown. Parents approve every deal, there’s no private chat, and kids never handle money.', home_body, home_schema, ''),
 ('parents/', 'ToySwap for Parents: Approvals, Rules and Payments', 'How parents set up ToySwap, approve every listing, purchase and swap, set spending limits, and pay or get paid securely through Stripe.', parents_body, [crumbs('For parents', 'parents/')], 'parents/'),
 ('safety/', 'Is ToySwap Safe for Kids? Our Safety Rules and Care Promise', 'ToySwap keeps kids safe with parent-created accounts, two-family approval, no private chat, nicknames only, and parent-led hand-overs.', safety_body, [crumbs('Safety', 'safety/')], 'safety/'),
 ('faq/', 'ToySwap FAQ: Selling, Swapping, Safety and Payments', 'Answers about how ToySwap works: swapping toys, parent approval, payments, safety, costs and the Android app.', faq_body, [crumbs('FAQ', 'faq/'), faq_schema(FAQ, SITE + '/faq/')], 'faq/'),
]

for path, title, desc, body, schema, active in PAGES:
    d = os.path.join(OUT, path)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page(path, title, desc, body, schema, active))

for name in ['styles.css', 'og-image.png', 'favicon.png', 'icon-192.png', 'icon-512.png']:
    shutil.copy(os.path.join(HERE, name), os.path.join(OUT, name))

with open(os.path.join(OUT, 'sitemap.xml'), 'w') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for path, *_ in PAGES:
        f.write(f'  <url><loc>{SITE}/{path}</loc><lastmod>{TODAY}</lastmod></url>\n')
    f.write('</urlset>\n')

with open(os.path.join(OUT, 'robots.txt'), 'w') as f:
    base = urlparse(SITE).path.rstrip('/')
    f.write(f'User-agent: *\nAllow: /\nDisallow: {base}/app/\n\nSitemap: {SITE}/sitemap.xml\n')

with open(os.path.join(OUT, 'site.webmanifest'), 'w') as f:
    json.dump({"name": "ToySwap", "short_name": "ToySwap", "start_url": "./app/", "display": "standalone", "background_color": "#FFD43B", "theme_color": "#FFD43B",
               "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}]}, f, indent=1)

llms = [f"# ToySwap\n\n> ToySwap is a safe, parent-approved peer-to-peer marketplace where kids (about 5–13) sell and swap toys they have outgrown. ToySwap does not own or sell toys; kids are the sellers and buyers, and a parent approves every listing, purchase and swap.\n",
        "## Key facts\n",
        "- Type: peer-to-peer (C2C) marketplace and toy-swap platform for kids, not a shop or single-vendor store.",
        "- Parents create kid accounts and approve every listing, purchase, swap and story; purchases and swaps need both families’ parents.",
        "- No private chat: kids use ready-made questions, answers and story messages.",
        "- Other kids only see a nickname, avatar and trade count.",
        "- Kids never handle money: the buyer’s parent pays by card via Stripe; the seller’s parent is paid via Stripe Connect.",
        "- Hand-overs happen with parents at public places or by parent-arranged delivery.",
        "- Care Promise: play gently, keep toys clean, keep pieces together, be kind and honest when trading.",
        "- Free to join; kids set their own prices; swaps are free.",
        f"- Available as a web app ({APP}) and an Android app ({APK}).\n",
        "## Pages\n",
        f"- [Home]({SITE}/): what ToySwap is and how it works",
        f"- [For parents]({SITE}/parents/): approvals, rules, payments, hand-overs",
        f"- [Safety]({SITE}/safety/): safety rules and the Care Promise",
        f"- [FAQ]({SITE}/faq/): common questions\n",
        "## FAQ\n"] + [f"### {q}\n{a}\n" for q, a in FAQ]
with open(os.path.join(OUT, 'llms.txt'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(llms))
print('built', len(PAGES), 'pages into', OUT)
