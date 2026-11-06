# Déploiement WAZYO — version sécurisée

## 1. Supabase
1. Ouvre **Supabase → SQL Editor**.
2. Exécute `supabase/schema.sql` sur le projet.
3. Crée ton compte admin dans **Authentication → Users**.
4. Copie son UUID puis exécute :

```sql
insert into public.admin_users(user_id) values ('UUID_DU_USER_AUTH');
```

> Ne mets jamais un mot de passe admin dans `VITE_*`, dans le code React ou dans `localStorage`.

## 2. Base déjà en production
Si Supabase contient déjà tes tables, applique `supabase/security_patch.sql`, puis `supabase/functional_fixes_2026.sql` dans le SQL Editor. Cette seconde migration est réexécutable et :
- conserve les tarifs de livraison déjà saisis dans `shipping_rates` ;
- autorise leur lecture publique uniquement via `get_public_shipping_rates()` ;
- ajoute la colonne Purchase manquante pour Meta CAPI et conserve le limiteur Lead déjà installé en production ;
- ajoute la réconciliation de commande après création d'un colis Yalidine ;
- ajoute les colonnes de réservation des notifications Telegram ;
- aligne la limite et les types MIME du bucket `product-images` sur l'import d'images.

**Les tarifs restent modifiables dans l'administration.** Ne remplace pas cette table par des montants codés dans le frontend.


Les fonctions déclencheur internes sont également retirées de l’API RPC publique ; les RPC client nécessaires à la commande, aux promotions, au tracking et aux liens influenceur restent accessibles selon leur usage. Les RPC administrateur continuent de vérifier `is_admin()`.

La migration supprime également des règles RLS historiques trop permissives sur les commandes, produits, notes clients, réglages, bannières et stockage. Elle conserve les politiques admin basées sur `is_admin()`, la lecture publique filtrée des réglages, la lecture des bannières actives et des images. Elle ne supprime aucune commande ni aucun tarif.

La configuration du bucket `product-images` conserve les types MIME déjà autorisés (dont HEIC/vidéo) et toute limite de taille supérieure déjà configurée.

Exécute ces migrations avant de déployer le nouveau frontend et les API. Puis exécute `supabase/feature_compatibility_preflight.sql` : il vérifie en lecture seule les fonctions et colonnes des variantes et du programme influenceurs. Ces objets ne sont pas définis intégralement dans les SQL actuellement versionnés ; ils peuvent avoir été ajoutés manuellement en production. Ne les supprime ni ne les remplace avant d'avoir vérifié ce rapport.

Si les tables du programme influenceurs sont déjà installées, applique ensuite `supabase/affiliate_public_rpc_hardening.sql`. Cette migration retire le pourcentage de commission interne des deux réponses RPC publiques ; le frontend n'utilise que le code, le produit et la remise. Ce fichier est optionnel et ne doit pas être exécuté sur une base qui ne possède pas ces tables.

## 3. Vercel
Copie les noms de variables de `.env.example` dans les paramètres Vercel (le fichier est un modèle, il ne contient aucune clé). Les variables serveur sensibles doivent être configurées dans Vercel et **ne doivent pas être commitées**. `SUPABASE_SECRET_KEY` est nécessaire aux fonctions serveur CAPI, import et notifications.

Variables particulièrement sensibles : `FB_CAPI_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `YALIDINE_API_ID`, `YALIDINE_API_TOKEN`.

`ALLOWED_ORIGINS` doit contenir uniquement des origines exactes. Les URLs Vercel de preview/branch ne sont jamais autorisées automatiquement ; ajoute une URL précise temporairement si un test en preview doit appeler l'API.

## 4. Supprimer l'ancien secret
Le projet ne contient plus de mot de passe administrateur de secours dans le frontend ni la logique `VITE_ADMIN_PASSWORD`. Après déploiement, supprime aussi les anciennes variables Vercel et efface les anciennes clés d'admin éventuellement présentes dans le navigateur (`localStorage`).

## 5. Cookies / Meta
Le bandeau à un seul bouton **OK** est conservé. Le Pixel Meta n'est activé qu'après l'action OK dans la version fournie.

## 6. Vérifications après déploiement
- créer une vraie commande test ;
- vérifier le stock après 2 commandes concurrentes ;
- vérifier le suivi avec l'ID de commande ;
- tester l'import produit uniquement connecté en admin ;
- tester l'expédition Yalidine avec les secrets Vercel ;
- vérifier qu'une double action admin ne crée qu'une seule tentative Yalidine ;
- tester Meta Lead/Purchase ;
- vérifier que les tarifs changés dans l'admin apparaissent sur une fiche produit et dans le formulaire de commande ;
- tester l'import AliExpress avec plusieurs images, dont une image volumineuse et une image refusée ;
- vérifier la notification Telegram d'une commande et l'absence de doublon ;
- vérifier qu'un utilisateur Auth non présent dans `admin_users` n'accède pas aux données admin.

## 7. Build
La validation complète `npm run build` doit être faite dans ton environnement CI/Vercel. Le présent audit a validé la syntaxe des fichiers API avec Node ; l'installation locale des dépendances n'a pas pu être terminée dans l'environnement d'audit.

## 8. Contrôles de maintenance
- Les dépendances de build sont mises à jour sur Vite 6.4.5, @vitejs/plugin-react 5.1.1 et DOMPurify 3.4.17 ; le contrôle npm audit et le build Vite ont été exécutés avec succès sur le dernier commit vérifié.
- Les politiques d'affiliation héritées sont désormais réservées au rôle `authenticated`. Le bloc SQL conditionnel les ajuste uniquement si ces tables et politiques optionnelles existent.
- Le workflow GitHub exécute le build et `npm audit --audit-level=high` sur les PR vers `main` et les pushes sur `main`.
- L'ancien fichier `src/vercel.json`, qui pointait vers un répertoire `Wazyo-app` absent, a été supprimé. La configuration Vercel du projet reste `smart-luxy-app/vercel.json`.
- Aucun `package-lock.json` n'est encore présent. `npm install` peut donc résoudre des versions différentes d'un build à l'autre ; il faudra ajouter le lockfile généré et le committer avant de remplacer `npm install` par `npm ci`.
