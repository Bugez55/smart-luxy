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
Si Supabase contient déjà tes tables, tu peux appliquer uniquement `supabase/security_patch.sql` au lieu de réexécuter tout le schéma.

## 3. Vercel
Ajoute les variables présentes dans `.env.example`. Les variables serveur sensibles doivent être configurées dans Vercel et **ne doivent pas être commitées**.

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
- vérifier qu'un utilisateur Auth non présent dans `admin_users` n'accède pas aux données admin.

## 7. Build
La validation complète `npm run build` doit être faite dans ton environnement CI/Vercel. Le présent audit a validé la syntaxe des fichiers API avec Node ; l'installation locale des dépendances n'a pas pu être terminée dans l'environnement d'audit.
