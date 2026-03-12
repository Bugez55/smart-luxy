# 🚀 Smart Luxy — Guide de déploiement

Temps estimé : **20–30 minutes** (une seule fois)

---

## ÉTAPE 1 — Créer le compte Supabase (base de données)

1. Aller sur **https://supabase.com** → "Start for free"
2. Se connecter avec GitHub ou email
3. Cliquer **"New project"**
   - Name : `smart-luxy`
   - Password : choisir un mot de passe fort (garder-le !)
   - Region : **EU West** (le plus proche de l'Algérie)
4. Attendre ~2 minutes que le projet se crée

### Copier les clés Supabase
- Aller dans **Settings → API**
- Copier :
  - `Project URL` → c'est ton `VITE_SUPABASE_URL`
  - `anon public key` → c'est ton `VITE_SUPABASE_ANON_KEY`

### Créer les tables
- Aller dans **SQL Editor**
- Coller tout le contenu du fichier `supabase/schema.sql`
- Cliquer **Run** ✅

---

## ÉTAPE 2 — Créer le compte Vercel (hébergement)

1. Aller sur **https://vercel.com** → "Sign up"
2. Se connecter avec **GitHub** (créer un compte GitHub si besoin)

---

## ÉTAPE 3 — Déployer le site

### Option A — Via GitHub (recommandé)

1. Créer un dépôt GitHub nommé `smart-luxy`
2. Dans le dossier `smart-luxy-app`, ouvrir un terminal :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TON_USERNAME/smart-luxy.git
   git push -u origin main
   ```
3. Sur Vercel → **"Add New Project"** → importer depuis GitHub → choisir `smart-luxy`
4. Framework : **Vite**

### Option B — Via Vercel CLI

```bash
npm install -g vercel
cd smart-luxy-app
npm install
vercel
```

---

## ÉTAPE 4 — Variables d'environnement sur Vercel

Dans Vercel → ton projet → **Settings → Environment Variables**, ajouter :

| Nom | Valeur |
|-----|--------|
| `VITE_SUPABASE_URL` | https://XXXX.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | eyJhbGci... |
| `VITE_TELEGRAM_TOKEN` | 8763463137:AAFaf_m86... |
| `VITE_TELEGRAM_CHAT_ID` | 1707871753 |
| `VITE_WA_NUMBER` | 213556688810 |
| `VITE_ADMIN_PASSWORD` | smartluxy2025 |

Cliquer **"Save"** puis **"Redeploy"**

---

## ÉTAPE 5 — Accéder au site

- **Boutique** : https://smart-luxy.vercel.app
- **Admin** : https://smart-luxy.vercel.app?admin

---

## ÉTAPE 6 — Ajouter les produits

1. Aller dans l'admin (`?admin`)
2. Se connecter avec le mot de passe : `smartluxy2025`
3. Onglet **Produits** → **+ Ajouter un produit**
4. Remplir le formulaire, uploader les photos directement
5. Les photos sont stockées sur Supabase Storage (gratuit jusqu'à 1GB)

---

## Fonctionnalités

### Boutique
- ✅ Catalogue produits avec grille responsive
- ✅ Filtres par catégorie + recherche
- ✅ Page produit détaillée (galerie, specs, lightbox)
- ✅ Panier
- ✅ Modal commande (nom, tél, wilaya/commune — 58 wilayas)
- ✅ Notification Telegram automatique à chaque commande
- ✅ Bouton WhatsApp
- ✅ Écran de confirmation avec numéro de commande

### Admin (`?admin`)
- ✅ Dashboard : stats (commandes, CA)
- ✅ Gestion commandes : filtres, recherche, statuts, contact WhatsApp
- ✅ Gestion produits : ajouter, modifier, masquer, supprimer
- ✅ Upload photos depuis l'appareil ou URL
- ✅ Commandes sauvegardées **en base de données** (permanent)

---

## Avantages vs l'ancien fichier HTML

| | Ancien (HTML) | Nouveau (React + Supabase) |
|--|--|--|
| Commandes | localStorage (se perdent) | Base de données permanente |
| Images | Base64 (7MB) | Hébergées sur Supabase (rapide) |
| Produits | Hardcodés dans le HTML | Modifiables sans toucher au code |
| Admin | Même fichier | Interface séparée propre |
| Chargement | Lent (7MB) | Rapide (< 200KB) |

---

## Support

Pour toute question ou modification, consulter la documentation :
- Supabase : https://supabase.com/docs
- Vercel : https://vercel.com/docs
