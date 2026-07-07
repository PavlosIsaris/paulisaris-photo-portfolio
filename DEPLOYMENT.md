# Deploying the Astro Photo Portfolio to DigitalOcean App Platform

**Goal:** Host this Astro site on DigitalOcean (DO) App Platform as a **second free static site**, auto-deploy it on every merge to a **`release`** branch, and move **`paulisaris.com`** to point at it (leaving the Hugo dev blog on `paulisaris.dev`).

**Short answer: yes, this is entirely possible.** DO App Platform lets you run multiple static sites for free, auto-deploy per-branch, and attach/move custom domains between apps. This document is the step-by-step plan.

---

## 1. Where things stand today

| Thing                        | Current state                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| This repo                    | `PavlosIsaris/paulisaris-photo-portfolio` (GitHub)                                                                 |
| Framework                    | Astro 5, **static** build → `dist/`                                                                                |
| Node version                 | 26 (`.nvmrc`)                                                                                                      |
| Current deploy               | `.github/workflows/deploy.yml` builds on push to `main` and pushes `dist/` to the `gh-pages` branch (GitHub Pages) |
| `site` in `astro.config.mts` | **Unset** — sitemap + RSS stay dormant until set                                                                   |
| Hugo dev blog                | Already on DO App Platform (free static site)                                                                      |
| `paulisaris.com`             | Currently → Hugo blog                                                                                              |
| `paulisaris.dev`             | Currently → Hugo blog (will **stay** there)                                                                        |

**Target end state:**

```
paulisaris.com  ──►  Astro photo portfolio  (new DO app, deploys from `release`)
paulisaris.dev  ──►  Hugo dev blog          (existing DO app, unchanged)
```

---

## 2. Publishing flow (the branch model)

```
feature branch ──► main  (integration / staging)
                     │
                     │  merge when you want to publish
                     ▼
                  release  ──► DigitalOcean auto-builds & deploys ──► paulisaris.com
```

- **`main`** stays your working/integration branch.
- **`release`** is the "this is live" branch. Merging into it triggers a deploy. Nothing else deploys the DO app.
- DO does the build itself (`npm run build`) — you do **not** need a GitHub Action to deploy to DO.

---

## 3. Phase 0 — Prepare the repo

Do these **before** touching the DO console.

### 3.1 Set the canonical site URL

Sitemap and RSS need the final domain. In `astro.config.mts`:

```ts
export default defineConfig({
    site: 'https://paulisaris.com',
    integrations: [mdx(), sitemap()],
    vite: { plugins: [tailwindcss()] },
});
```

### 3.2 Create the `release` branch

```bash
git checkout main
git pull
git checkout -b release
git push -u origin release
```

### 3.3 Decide what to do with the existing GitHub Pages deploy

`.github/workflows/deploy.yml` currently publishes to GitHub Pages on every push to `main`. Two options:

- **Recommended — retire it.** Once DO is the host, delete `deploy.yml` (and later the `gh-pages` branch). Keep `test.yml` and `quality.yml` — those are still useful CI on PRs.
- **Or keep it** as a staging mirror on `github.io`. Harmless, just redundant.

> Keep `test.yml` / `quality.yml` regardless — they gate your PRs before code reaches `release`.

### 3.4 (Optional) Commit a DO App Spec

You can define the app declaratively instead of clicking through the UI. Create `.do/app.yaml`:

```yaml
name: paulisaris-photo-portfolio
region: fra # pick the region closest to you / your audience
static_sites:
    - name: astro-portfolio
      github:
          repo: PavlosIsaris/paulisaris-photo-portfolio
          branch: release
          deploy_on_push: true
      build_command: npm run build
      output_dir: dist
      # environment_slug is auto-detected (Node). See §7 on the Node version.
```

This lets you recreate/version the app config. You can still create the app via the UI (§4) if you prefer.

---

## 4. Phase 1 — Create the new DO static site

In the DigitalOcean console:

1. **Apps → Create App**.
2. **Source:** GitHub → authorize if needed → pick `PavlosIsaris/paulisaris-photo-portfolio`.
3. **Branch:** `release`. Enable **Autodeploy** ("Deploy on push").
4. DO inspects the repo and should detect a static site. Confirm/set:
    - **Build command:** `npm run build`
    - **Output directory:** `dist`
    - **Resource type:** **Static Site** (not Web Service — that matters for the free tier).
5. **Plan:** choose the **Static Site (free)** tier.
6. Name the app something clear, e.g. `paulisaris-photo-portfolio`, and create it.
7. Watch the first build in the **Activity/Deployments** tab. It will build from `release` and give you a temporary URL like `https://astro-portfolio-xxxx.ondigitalocean.app`. Verify the site looks right there **before** touching DNS.

---

## 5. Phase 2 — Confirm the auto-deploy

You already set `deploy_on_push`, so:

```bash
# make a trivial change on main, then:
git checkout release
git merge main
git push
```

Confirm a new deployment kicks off automatically in the DO **Deployments** tab. This is your ongoing publish action from now on.

---

## 6. Phase 3 — Move `paulisaris.com` to the new app

> ⚠️ A domain can be attached to **only one** App Platform app at a time. You must detach it from the Hugo app before (or as part of) attaching it to the Astro app. Expect a few minutes of cutover while the new TLS cert is issued.

### 6.1 Detach from the Hugo app

DO console → **Apps → (Hugo blog app) → Settings → Domains** → remove `paulisaris.com` (and `www.paulisaris.com` if present).
Leave `paulisaris.dev` on the Hugo app untouched.

### 6.2 Attach to the Astro app

DO console → **Apps → (new Astro app) → Settings → Domains → Add Domain** → `paulisaris.com`.
Add `www.paulisaris.com` too if you want it (set one as primary and redirect the other).

### 6.3 DNS — pick the branch that matches your setup

How you finish depends on where `paulisaris.com`'s DNS is managed:

- **A) DNS already managed by DigitalOcean** (nameservers point to `ns1/2/3.digitalocean.com` — likely, since the domain already works on your DO Hugo app):
  DO manages the records for you. When you add the domain to the Astro app it wires up the correct `A`/`ALIAS` records automatically. Usually nothing else to do.

- **B) DNS managed at your registrar** (external):
  DO will show you a target when you add the domain. Point the records there:
    - Apex `paulisaris.com` → an **A/ALIAS/ANAME** record to the app (registrars that support CNAME-flattening/ALIAS on the apex; DO shows the exact value).
    - `www` → **CNAME** to the app's `*.ondigitalocean.app` hostname.
    - If your registrar can't do ALIAS/ANAME on the apex, the clean fix is to **delegate the domain's DNS to DigitalOcean** (set nameservers to DO), then use option A.

### 6.4 Wait for SSL

DO auto-provisions a Let's Encrypt certificate once DNS resolves to the app. The domain shows "pending" until then; give it up to ~30–60 min. HTTPS then works automatically.

---

## 7. Gotchas & notes

- **Node 26 support.** `.nvmrc` pins Node **26**, which is very new. Confirm DO's static-site buildpack supports it. If the build fails on Node version, either (a) pin to the latest Node LTS DO supports in `.nvmrc`, or (b) set an app-level env var / `engines.node` in `package.json`. Verify the temporary `.ondigitalocean.app` build (§4.7) before DNS cutover so any version issue surfaces early.
- **`.npmrc` settings.** This repo sets `ignore-scripts=true`, `engine-strict=true`, and `min-release-age=7`. `npm ci` on DO will honor these. `ignore-scripts` is fine for Astro's dependency set; if any future dependency needs a postinstall build step, revisit it. Unknown keys like `min-release-age` are ignored with a warning on older npm — harmless.
- **Free tier limits.** DO App Platform allows a small number of free static sites per account (3 at time of writing). This is your 2nd, so you're fine — but confirm current pricing, as DO has changed static-site pricing before.
- **Apex domain.** Root/apex domains can't use a plain CNAME. That's why option 6.3-A (DO-managed DNS) is the smoothest path — DO handles the `ALIAS` record for you.
- **One domain, one app.** If a deploy or domain-add fails with a conflict, it's almost always because `paulisaris.com` is still attached to the Hugo app. Detach first (§6.1).
- **Rollbacks.** DO keeps deployment history; you can redeploy a previous build from the Deployments tab. Because `release` is separate from `main`, you also control publishing purely by when you merge.

---

## 8. Checklist

- [ ] `site: 'https://paulisaris.com'` set in `astro.config.mts`
- [ ] `release` branch created & pushed
- [ ] Decided on GitHub Pages workflow (retire or keep)
- [ ] (Optional) `.do/app.yaml` committed
- [ ] New DO static site created from `release`, autodeploy on, build `npm run build` → `dist`
- [ ] Temporary `*.ondigitalocean.app` URL verified (incl. Node build OK)
- [ ] Test merge `main → release` triggers an auto-deploy
- [ ] `paulisaris.com` detached from Hugo app
- [ ] `paulisaris.com` attached to Astro app + DNS confirmed
- [ ] SSL issued, `https://paulisaris.com` serves the Astro site
- [ ] `paulisaris.dev` still serves the Hugo blog
- [ ] (Cleanup) delete `deploy.yml` + `gh-pages` branch if retiring GitHub Pages

```

```
