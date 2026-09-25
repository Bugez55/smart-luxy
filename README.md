# WAZYO — boutique e-commerce Algérie

Version corrigée pour déploiement Vercel + Supabase.

Principales protections incluses : RLS Supabase restrictive, création de commande atomique avec prix/stock recalculés côté serveur, suivi public limité, authentification admin Supabase, secrets livraison côté serveur, protection SSRF pour l'import produit, CAPI Meta côté serveur, échappement des impressions admin, et cache PWA versionné.

Le bandeau cookies à un seul bouton « OK » est conservé. Le Pixel Meta n'est chargé qu'après cette action dans la version fournie.

Voir `DEPLOY.md` pour les étapes Supabase/Vercel.
