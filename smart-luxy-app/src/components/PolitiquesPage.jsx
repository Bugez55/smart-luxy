import { useState } from 'react'

import CONFIG from '../config'

export default function PolitiquesPage({ defaultTab = 'confidentialite', onClose }) {
  const [tab, setTab] = useState(defaultTab)
  const [lang, setLang] = useState('fr')

  const content = {
    confidentialite: {
      fr: {
        title: 'Politique de Confidentialité',
        emoji: '🔒',
        date: 'Dernière mise à jour : Mars 2025',
        sections: [
          {
            title: '1. Informations collectées',
            text: `Dans le cadre de votre commande, Smart Luxy collecte uniquement les informations suivantes :\n• Nom et prénom\n• Numéro de téléphone\n• Wilaya et commune de livraison\n• Adresse de livraison (optionnel)\n• Note de commande (optionnel)\n\nCes informations sont strictement nécessaires au traitement et à la livraison de votre commande.`
          },
          {
            title: '2. Utilisation des données',
            text: `Vos données personnelles sont utilisées exclusivement pour :\n• Traiter et confirmer votre commande\n• Organiser la livraison à votre adresse\n• Vous contacter en cas de besoin concernant votre commande\n• Améliorer nos services\n\nNous ne vendons, ne louons et ne partageons jamais vos données avec des tiers à des fins commerciales.`
          },
          {
            title: '3. Conservation des données',
            text: `Vos données sont conservées uniquement pendant la durée nécessaire au traitement de votre commande, et pendant une période maximale de 12 mois après la livraison, conformément aux obligations légales algériennes.`
          },
          {
            title: '4. Sécurité',
            text: `Smart Luxy met en place toutes les mesures techniques nécessaires pour protéger vos données contre tout accès non autorisé, modification, divulgation ou destruction. Vos informations sont stockées de manière sécurisée via des services certifiés.`
          },
          {
            title: '5. Vos droits',
            text: `Conformément à la loi algérienne n°18-07 relative à la protection des données personnelles, vous disposez des droits suivants :\n• Droit d'accès à vos données\n• Droit de rectification de vos données\n• Droit de suppression de vos données\n• Droit d'opposition au traitement\n\nPour exercer ces droits, contactez-nous via WhatsApp : +' + CONFIG.telephone + '.replace('${CONFIG.telephone}', CONFIG.telephone)`
          },
          {
            title: '6. Cookies',
            text: `Notre site utilise uniquement des données de session techniques nécessaires au bon fonctionnement de la boutique (panier, préférences). Aucun cookie publicitaire ou de traçage tiers n'est utilisé.`
          },
          {
            title: '7. Modifications',
            text: `Smart Luxy se réserve le droit de modifier cette politique à tout moment. Les modifications entrent en vigueur dès leur publication sur le site. Nous vous encourageons à consulter régulièrement cette page.`
          },
          {
            title: '8. Contact',
            text: `Pour toute question relative à votre vie privée :\n📱 WhatsApp : ${CONFIG.telephone}\n📧 Email : nabilmohellebi2@gmail.com`
          }
        ]
      },
      ar: {
        title: 'سياسة الخصوصية',
        emoji: '🔒',
        date: 'آخر تحديث: مارس 2025',
        dir: 'rtl',
        sections: [
          {
            title: '١. المعلومات التي نجمعها',
            text: `عند تقديم طلبك، تقوم Smart Luxy بجمع المعلومات التالية فقط:\n• الاسم واللقب\n• رقم الهاتف\n• الولاية والبلدية للتوصيل\n• عنوان التوصيل (اختياري)\n• ملاحظة الطلب (اختياري)\n\nهذه المعلومات ضرورية فقط لمعالجة طلبك وتسليمه.`
          },
          {
            title: '٢. استخدام البيانات',
            text: `تُستخدم بياناتك الشخصية حصريًا من أجل:\n• معالجة طلبك وتأكيده\n• تنظيم التوصيل إلى عنوانك\n• التواصل معك عند الحاجة بخصوص طلبك\n• تحسين خدماتنا\n\nنحن لا نبيع أو نؤجر أو نشارك بياناتك مع أطراف ثالثة لأغراض تجارية أبدًا.`
          },
          {
            title: '٣. الاحتفاظ بالبيانات',
            text: `يتم الاحتفاظ ببياناتك فقط طوال المدة اللازمة لمعالجة طلبك، وبعد ذلك لمدة لا تتجاوز 12 شهرًا من تاريخ التسليم، وفقًا للالتزامات القانونية الجزائرية.`
          },
          {
            title: '٤. الأمان',
            text: `تتخذ Smart Luxy جميع التدابير التقنية اللازمة لحماية بياناتك من أي وصول غير مصرح به أو تعديل أو إفصاح أو تدمير. يتم تخزين معلوماتك بشكل آمن عبر خدمات معتمدة.`
          },
          {
            title: '٥. حقوقك',
            text: `وفقًا للقانون الجزائري رقم 18-07 المتعلق بحماية البيانات الشخصية، تتمتع بالحقوق التالية:\n• الحق في الوصول إلى بياناتك\n• الحق في تصحيح بياناتك\n• الحق في حذف بياناتك\n• الحق في الاعتراض على المعالجة\n\nلممارسة هذه الحقوق، تواصل معنا عبر واتساب: 213 556 688 810+`
          },
          {
            title: '٦. ملفات تعريف الارتباط',
            text: `يستخدم موقعنا فقط البيانات التقنية الضرورية لحسن سير المتجر (سلة التسوق، التفضيلات). لا يتم استخدام أي ملفات تتبع أو إعلانات خارجية.`
          },
          {
            title: '٧. التعديلات',
            text: `تحتفظ Smart Luxy بحق تعديل هذه السياسة في أي وقت. تدخل التعديلات حيز التنفيذ فور نشرها على الموقع. نشجعك على مراجعة هذه الصفحة بانتظام.`
          },
          {
            title: '٨. التواصل',
            text: `لأي سؤال يتعلق بخصوصيتك:\n📱 واتساب: 213 556 688 810+\n📧 البريد الإلكتروني: nabilmohellebi2@gmail.com`
          }
        ]
      }
    },
    retour: {
      fr: {
        title: 'Politique de Retour & Remboursement',
        emoji: '🔄',
        date: 'Dernière mise à jour : Mars 2025',
        sections: [
          {
            title: '1. Délai de retour',
            text: `Vous disposez de 7 jours calendaires à compter de la date de réception de votre commande pour demander un retour ou un échange, sous réserve que le produit soit dans son état d'origine (non utilisé, emballage intact, accessoires inclus).`
          },
          {
            title: '2. Conditions de retour acceptées ✅',
            text: `Un retour est accepté dans les cas suivants :\n✅ Produit reçu défectueux ou endommagé\n✅ Produit ne correspondant pas à la description sur le site\n✅ Erreur dans la commande (mauvaise référence, mauvaise couleur, mauvaise taille)\n✅ Produit non conforme à ce qui a été commandé\n✅ Colis endommagé à la livraison`
          },
          {
            title: '3. Cas de non-retour ❌',
            text: `Les retours ne sont pas acceptés dans les cas suivants :\n❌ Produit utilisé, lavé ou endommagé par le client\n❌ Emballage ouvert pour les produits d'hygiène, cosmétiques ou alimentaires\n❌ Demande de retour après le délai de 7 jours\n❌ Changement d'avis du client sans défaut constaté sur le produit\n❌ Produit retourné incomplet (accessoires manquants)`
          },
          {
            title: '4. Procédure de retour',
            text: `Pour effectuer un retour, suivez ces étapes :\n\n1️⃣ Contactez-nous via WhatsApp dans les 7 jours suivant la réception\n2️⃣ Envoyez des photos claires du produit et du problème constaté\n3️⃣ Après validation de votre demande, nous vous indiquons la procédure d'envoi\n4️⃣ Emballez soigneusement le produit dans son emballage d'origine\n5️⃣ Nous organisons l'enlèvement ou vous indiquons le point de dépôt\n\n📱 WhatsApp : ${CONFIG.telephone}`
          },
          {
            title: '5. Remboursement',
            text: `En cas de retour validé par notre équipe :\n• Remboursement intégral du montant payé (produit + livraison si erreur de notre part)\n• Le remboursement est effectué dans un délai de 5 à 10 jours ouvrables après réception du retour\n• Mode de remboursement : virement bancaire CCP/CIB ou espèces, selon votre préférence\n\n⚠️ Les frais de retour sont à votre charge sauf en cas de produit défectueux ou erreur de notre part.`
          },
          {
            title: '6. Échange',
            text: `Si vous préférez un échange plutôt qu'un remboursement :\n• L'échange est possible sous réserve de disponibilité du produit\n• Livraison du produit de remplacement offerte par Smart Luxy en cas de défaut ou erreur de notre part\n• Délai d'échange : 3 à 7 jours ouvrables après réception du retour\n\nContactez-nous via WhatsApp pour organiser l'échange.`
          },
          {
            title: '7. Colis endommagé à la livraison',
            text: `Si votre colis arrive endommagé :\n📸 Prenez des photos du colis et du produit immédiatement, avant ouverture complète\n📱 Contactez-nous dans les 24h via WhatsApp avec les photos\n✅ Nous procédons à un remplacement ou remboursement intégral sans frais supplémentaires\n\n⚠️ Important : Acceptez le colis même endommagé, puis contactez-nous avec les preuves. Ne refusez pas la livraison.`
          },
          {
            title: '8. Responsabilité',
            text: `Smart Luxy s'engage à :\n• Vendre uniquement des produits conformes aux descriptions publiées\n• Traiter toutes les réclamations dans un délai de 24 à 48 heures\n• Assurer un service après-vente sérieux et réactif\n\nSmart Luxy n'est pas responsable des retards de livraison causés par des événements exceptionnels (grèves, catastrophes naturelles, etc.).`
          },
          {
            title: '9. Contact SAV',
            text: `Pour toute réclamation ou question :\n📱 WhatsApp : ${CONFIG.telephone}\n📧 Email : nabilmohellebi2@gmail.com\n🕐 Disponible 7j/7 de 8h à 22h`
          }
        ]
      },
      ar: {
        title: 'سياسة الإرجاع والاسترداد',
        emoji: '🔄',
        date: 'آخر تحديث: مارس 2025',
        dir: 'rtl',
        sections: [
          {
            title: '١. مدة الإرجاع',
            text: `لديك 7 أيام تقويمية من تاريخ استلام طلبك لطلب الإرجاع أو الاستبدال، بشرط أن يكون المنتج في حالته الأصلية (غير مستخدم، العبوة سليمة، مع جميع الملحقات).`
          },
          {
            title: '٢. حالات قبول الإرجاع ✅',
            text: `يُقبل الإرجاع في الحالات التالية:\n✅ استلام منتج معيب أو تالف\n✅ المنتج لا يطابق الوصف المنشور على الموقع\n✅ خطأ في الطلب (مرجع خاطئ، لون خاطئ، مقاس خاطئ)\n✅ المنتج لا يوافق ما تم طلبه\n✅ وصول الطرد تالفًا عند التسليم`
          },
          {
            title: '٣. حالات رفض الإرجاع ❌',
            text: `لا يُقبل الإرجاع في الحالات التالية:\n❌ منتج مستخدم أو تالف من قِبَل العميل\n❌ عبوة مفتوحة لمنتجات النظافة أو مستحضرات التجميل\n❌ طلب الإرجاع بعد مرور 7 أيام\n❌ تغيير رأي العميل دون وجود عيب في المنتج\n❌ إرجاع المنتج ناقصًا (ملحقات مفقودة)`
          },
          {
            title: '٤. إجراءات الإرجاع',
            text: `لإجراء الإرجاع، اتبع الخطوات التالية:\n\n1️⃣ تواصل معنا عبر واتساب خلال 7 أيام من الاستلام\n2️⃣ أرسل صورًا واضحة للمنتج والمشكلة الملاحظة\n3️⃣ بعد التحقق من طلبك، سنوضح لك إجراءات الإرسال\n4️⃣ قم بتعبئة المنتج بعناية في عبوته الأصلية\n5️⃣ سننظم الاستلام أو نوضح لك نقطة الإيداع\n\n📱 واتساب: 213 556 688 810+`
          },
          {
            title: '٥. الاسترداد',
            text: `في حالة قبول الإرجاع من قِبَل فريقنا:\n• استرداد كامل للمبلغ المدفوع (المنتج + التوصيل في حالة الخطأ من جانبنا)\n• يتم الاسترداد خلال 5 إلى 10 أيام عمل بعد استلام المُرجَع\n• طريقة الاسترداد: تحويل بنكي CCP/CIB أو نقدًا حسب تفضيلك\n\n⚠️ تكاليف الإرجاع على عاتقك إلا في حالة المنتج المعيب أو الخطأ من جانبنا.`
          },
          {
            title: '٦. الاستبدال',
            text: `إذا كنت تفضل الاستبدال بدلاً من الاسترداد:\n• الاستبدال ممكن بشرط توفر المنتج\n• تكاليف شحن المنتج البديل على عاتق Smart Luxy في حالة العيب أو الخطأ من جانبنا\n• مدة الاستبدال: 3 إلى 7 أيام عمل بعد استلام المُرجَع\n\nتواصل معنا عبر واتساب لتنظيم الاستبدال.`
          },
          {
            title: '٧. الطرود التالفة عند التسليم',
            text: `إذا وصل طردك تالفًا:\n📸 التقط صورًا للطرد والمنتج فورًا قبل الفتح الكامل\n📱 تواصل معنا خلال 24 ساعة عبر واتساب مع الصور\n✅ سنقوم بالاستبدال أو الاسترداد الكامل بدون رسوم إضافية\n\n⚠️ مهم: اقبل الطرد حتى وإن كان تالفًا، ثم تواصل معنا بالإثباتات. لا ترفض التسليم.`
          },
          {
            title: '٨. المسؤولية',
            text: `تلتزم Smart Luxy بـ:\n• بيع المنتجات المطابقة للأوصاف المنشورة فقط\n• معالجة جميع الشكاوى في غضون 24 إلى 48 ساعة\n• ضمان خدمة ما بعد البيع جدية وسريعة الاستجابة\n\nلا تتحمل Smart Luxy المسؤولية عن تأخيرات التوصيل الناجمة عن أحداث استثنائية (إضرابات، كوارث طبيعية، إلخ).`
          },
          {
            title: '٩. خدمة ما بعد البيع',
            text: `لأي شكوى أو سؤال:\n📱 واتساب: 213 556 688 810+\n📧 البريد الإلكتروني: nabilmohellebi2@gmail.com\n🕐 متاح 7 أيام/7 من 8 صباحًا إلى 10 مساءً`
          }
        ]
      }
    }
  }

  const current = content[tab][lang]
  const isRtl = lang === 'ar'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{
        background: '#141414',
        width: '100%', maxWidth: 680,
        maxHeight: '92vh',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'polSlideUp .3s cubic-bezier(.22,1,.36,1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: '#1a1a1a',
          borderBottom: '1px solid #2a2a2a',
          padding: '16px 16px 12px',
          flexShrink: 0,
        }}>
          {/* Row 1: titre + actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: 'white', letterSpacing: '-.02em' }}>
              Smart <span style={{ color: '#C9A84C' }}>Luxy</span>
              <span style={{ color: '#555', fontWeight: 400, marginLeft: 6, fontSize: 13 }}>· Informations légales</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setLang(l => l === 'fr' ? 'ar' : 'fr')} style={{
                background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.25)',
                borderRadius: 20, padding: '5px 14px', color: '#C9A84C',
                fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {lang === 'fr' ? '🇩🇿 عربي' : '🇫🇷 Français'}
              </button>
              <button onClick={onClose} style={{
                background: '#2a2a2a', border: 'none', borderRadius: '50%',
                width: 32, height: 32, color: '#aaa', fontSize: 15,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          </div>

          {/* Row 2: Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'confidentialite', labelFr: '🔒 Confidentialité', labelAr: '🔒 الخصوصية' },
              { key: 'retour',          labelFr: '🔄 Retours & Remboursements', labelAr: '🔄 الإرجاع والاسترداد' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 8px',
                background: tab === t.key ? '#C9A84C' : 'rgba(255,255,255,.04)',
                border: '1px solid ' + (tab === t.key ? '#C9A84C' : '#2e2e2e'),
                borderRadius: 10,
                color: tab === t.key ? '#0e0e0e' : 'rgba(255,255,255,.5)',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                transition: 'all .2s', lineHeight: 1.3,
              }}>
                {lang === 'fr' ? t.labelFr : t.labelAr}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 16px',
          direction: isRtl ? 'rtl' : 'ltr',
        }}>
          {/* Titre de section */}
          <div style={{
            textAlign: 'center', marginBottom: 20,
            padding: '16px', background: 'rgba(201,168,76,.06)',
            border: '1px solid rgba(201,168,76,.15)', borderRadius: 14,
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>{current.emoji}</div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: 'white', margin: '0 0 4px', letterSpacing: '-.02em' }}>
              {current.title}
            </h1>
            <div style={{ fontSize: 11, color: '#555' }}>{current.date}</div>
          </div>

          {/* Sections */}
          {current.sections.map((s, i) => (
            <div key={i} style={{
              marginBottom: 12,
              background: '#1c1c1c',
              border: '1px solid #272727',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #272727',
                background: '#202020',
              }}>
                <h2 style={{
                  fontSize: 13, fontWeight: 800, color: '#C9A84C', margin: 0,
                }}>
                  {s.title}
                </h2>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <p style={{
                  fontSize: 13.5, lineHeight: 1.9,
                  color: 'rgba(255,255,255,.65)',
                  margin: 0, whiteSpace: 'pre-line',
                }}>
                  {s.text}
                </p>
              </div>
            </div>
          ))}

          {/* Footer légal */}
          <div style={{
            marginTop: 20, padding: '14px',
            background: '#1a1a1a', border: '1px solid #272727',
            borderRadius: 12, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.8 }}>
              {lang === 'fr'
                ? `© ${new Date().getFullYear()} Smart Luxy · Algérie 🇩🇿\nTous droits réservés`
                : `© ${new Date().getFullYear()} Smart Luxy · الجزائر 🇩🇿\nجميع الحقوق محفوظة`
              }
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes polSlideUp {
          from { transform: translateY(50px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
