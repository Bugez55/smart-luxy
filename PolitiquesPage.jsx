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
        date: 'Dernière mise à jour : Septembre 2026',
        sections: [
          {
            title: '1. Informations collectées',
            text: `Lors d'une commande, Wazyo collecte les informations nécessaires au traitement et à la livraison : nom, téléphone, wilaya, commune, adresse et éventuelle note de commande. Des données techniques peuvent aussi être enregistrées pour le fonctionnement du site (panier et préférences).`
          },
          {
            title: '2. Utilisation des données',
            text: `Les données servent à traiter et confirmer la commande, organiser la livraison, contacter le client lorsque nécessaire et améliorer le fonctionnement de la boutique. Certaines données peuvent être transmises à un prestataire de livraison lorsqu'elles sont nécessaires à l'expédition.`
          },
          {
            title: '3. Conservation',
            text: `Les données sont conservées pendant la durée nécessaire au traitement des commandes et au service client, puis supprimées ou archivées selon les besoins de l'activité et les obligations légales applicables.`
          },
          {
            title: '4. Sécurité',
            text: `Wazyo applique des mesures techniques raisonnables pour limiter les accès non autorisés et protéger les données de commande. Les accès administratifs et les données sensibles du serveur sont séparés du navigateur client.`
          },
          {
            title: '5. Vos droits',
            text: `Selon la réglementation applicable, vous pouvez demander l'accès, la rectification ou la suppression de vos données, ou vous opposer à certains traitements. Pour toute demande : WhatsApp +${CONFIG.telephone} ou ${CONFIG.email}.`
          },
          {
            title: '6. Cookies et traceurs',
            text: `Le site utilise des données locales nécessaires au fonctionnement de la boutique, notamment pour le panier et certaines préférences. Après avoir appuyé sur « OK » dans le bandeau cookies, l'outil Meta peut être activé afin de mesurer l'efficacité des campagnes publicitaires. Sans cette action, le Pixel Meta n'est pas chargé.`
          },
          {
            title: '7. Modifications',
            text: `Cette politique peut être mise à jour lorsque le fonctionnement de la boutique ou les services utilisés évoluent.`
          },
          {
            title: '8. Contact',
            text: `📱 WhatsApp : +${CONFIG.telephone}
📧 Email : ${CONFIG.email}`
          }
        ]
      },
      ar: {
        title: 'سياسة الخصوصية',
        emoji: '🔒',
        date: 'آخر تحديث: سبتمبر 2026',
        dir: 'rtl',
        sections: [
          {
            title: '١. المعلومات التي يتم جمعها',
            text: `عند تقديم طلب، تجمع Wazyo المعلومات اللازمة لمعالجة الطلب وتوصيله: الاسم، رقم الهاتف، الولاية، البلدية، العنوان وأي ملاحظة خاصة بالطلب. كما يمكن حفظ بعض البيانات التقنية اللازمة لعمل الموقع مثل السلة والتفضيلات.`
          },
          {
            title: '٢. استخدام البيانات',
            text: `تُستخدم البيانات لمعالجة الطلب وتأكيده وتنظيم التوصيل والتواصل مع العميل عند الحاجة وتحسين عمل المتجر. ويمكن مشاركة البيانات الضرورية مع شركة التوصيل عند الحاجة لإرسال الطلب.`
          },
          {
            title: '٣. الاحتفاظ بالبيانات',
            text: `يتم الاحتفاظ بالبيانات طوال المدة اللازمة لمعالجة الطلبات وخدمة العملاء، ثم حذفها أو أرشفتها بحسب احتياجات النشاط والمتطلبات القانونية السارية.`
          },
          {
            title: '٤. الأمان',
            text: `تطبق Wazyo إجراءات تقنية للحد من الوصول غير المصرح به وحماية بيانات الطلبات. كما يتم فصل الوصول الإداري والبيانات الحساسة الخاصة بالخادم عن متصفح العميل.`
          },
          {
            title: '٥. حقوقك',
            text: `وفقًا للتنظيم المعمول به، يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها، أو الاعتراض على بعض عمليات المعالجة. للتواصل: واتساب +${CONFIG.telephone} أو ${CONFIG.email}.`
          },
          {
            title: '٦. ملفات الارتباط وأدوات التتبع',
            text: `يستخدم الموقع بيانات محلية ضرورية لعمل المتجر، مثل السلة وبعض التفضيلات. بعد الضغط على «موافق / OK» في إشعار ملفات الارتباط، يمكن تفعيل أداة Meta لقياس فعالية الحملات الإعلانية. قبل ذلك لا يتم تحميل Pixel Meta.`
          },
          {
            title: '٧. التعديلات',
            text: `يمكن تحديث هذه السياسة عندما يتغير تشغيل المتجر أو الخدمات المستخدمة.`
          },
          {
            title: '٨. التواصل',
            text: `📱 واتساب: +${CONFIG.telephone}
📧 البريد الإلكتروني: ${CONFIG.email}`
          }
        ]
      }
    },
    retour: {
      fr: {
        title: 'Politique de Retour & Remboursement',
        emoji: '🔄',
        date: 'Dernière mise à jour : Septembre 2026',
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
            text: `Si vous préférez un échange plutôt qu'un remboursement :\n• L'échange est possible sous réserve de disponibilité du produit\n• Livraison du produit de remplacement offerte par Wazyo en cas de défaut ou erreur de notre part\n• Délai d'échange : 3 à 7 jours ouvrables après réception du retour\n\nContactez-nous via WhatsApp pour organiser l'échange.`
          },
          {
            title: '7. Colis endommagé à la livraison',
            text: `Si votre colis arrive endommagé :\n📸 Prenez des photos du colis et du produit immédiatement, avant ouverture complète\n📱 Contactez-nous dans les 24h via WhatsApp avec les photos\n✅ Nous procédons à un remplacement ou remboursement intégral sans frais supplémentaires\n\n⚠️ Important : Acceptez le colis même endommagé, puis contactez-nous avec les preuves. Ne refusez pas la livraison.`
          },
          {
            title: '8. Responsabilité',
            text: `Wazyo s'engage à :\n• Vendre uniquement des produits conformes aux descriptions publiées\n• Traiter toutes les réclamations dans un délai de 24 à 48 heures\n• Assurer un service après-vente sérieux et réactif\n\nWazyo n'est pas responsable des retards de livraison causés par des événements exceptionnels (grèves, catastrophes naturelles, etc.).`
          },
          {
            title: '9. Contact SAV',
            text: `Pour toute réclamation ou question :\n📱 WhatsApp : ${CONFIG.telephone}\n📧 Email : ${CONFIG.email}\n🕐 Disponible 7j/7 de 8h à 22h`
          }
        ]
      },
      ar: {
        title: 'سياسة الإرجاع والاسترداد',
        emoji: '🔄',
        date: 'آخر تحديث: سبتمبر 2026',
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
            text: `إذا كنت تفضل الاستبدال بدلاً من الاسترداد:\n• الاستبدال ممكن بشرط توفر المنتج\n• تكاليف شحن المنتج البديل على عاتق Wazyo في حالة العيب أو الخطأ من جانبنا\n• مدة الاستبدال: 3 إلى 7 أيام عمل بعد استلام المُرجَع\n\nتواصل معنا عبر واتساب لتنظيم الاستبدال.`
          },
          {
            title: '٧. الطرود التالفة عند التسليم',
            text: `إذا وصل طردك تالفًا:\n📸 التقط صورًا للطرد والمنتج فورًا قبل الفتح الكامل\n📱 تواصل معنا خلال 24 ساعة عبر واتساب مع الصور\n✅ سنقوم بالاستبدال أو الاسترداد الكامل بدون رسوم إضافية\n\n⚠️ مهم: اقبل الطرد حتى وإن كان تالفًا، ثم تواصل معنا بالإثباتات. لا ترفض التسليم.`
          },
          {
            title: '٨. المسؤولية',
            text: `تلتزم Wazyo بـ:\n• بيع المنتجات المطابقة للأوصاف المنشورة فقط\n• معالجة جميع الشكاوى في غضون 24 إلى 48 ساعة\n• ضمان خدمة ما بعد البيع جدية وسريعة الاستجابة\n\nلا تتحمل Wazyo المسؤولية عن تأخيرات التوصيل الناجمة عن أحداث استثنائية (إضرابات، كوارث طبيعية، إلخ).`
          },
          {
            title: '٩. خدمة ما بعد البيع',
            text: `لأي شكوى أو سؤال:\n📱 واتساب: 213 556 688 810+\n📧 البريد الإلكتروني: ${CONFIG.email}\n🕐 متاح 7 أيام/7 من 8 صباحًا إلى 10 مساءً`
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
        background: 'var(--card)',
        width: '100%', maxWidth: 680,
        maxHeight: '92vh',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'polSlideUp .3s cubic-bezier(.22,1,.36,1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'var(--card2)',
          borderBottom: '1px solid #2a2a2a',
          padding: '16px 16px 12px',
          flexShrink: 0,
        }}>
          {/* Row 1: titre + actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color:'var(--g3)', letterSpacing: '-.02em' }}>
              Wazyo
              <span style={{ color: 'var(--g4)', fontWeight: 400, marginLeft: 6, fontSize: 13 }}>· Informations légales</span>
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
                width: 32, height: 32, color: 'var(--g4)', fontSize: 15,
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
                background: tab === t.key ? '#C9A84C' : 'var(--g3)',
                border: '1px solid ' + (tab === t.key ? '#C9A84C' : '#2e2e2e'),
                borderRadius: 10,
                color: tab === t.key ? '#0e0e0e' : 'var(--g3)',
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
            <h1 style={{ fontSize: 18, fontWeight: 900, color:'var(--g3)', margin: '0 0 4px', letterSpacing: '-.02em' }}>
              {current.title}
            </h1>
            <div style={{ fontSize: 11, color: 'var(--g4)' }}>{current.date}</div>
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
                  color: 'var(--g3)',
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
            background: 'var(--card2)', border: '1px solid #272727',
            borderRadius: 12, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--g4)', lineHeight: 1.8 }}>
              {lang === 'fr'
                ? `© ${new Date().getFullYear()} Wazyo · Algérie 🇩🇿\nTous droits réservés`
                : `© ${new Date().getFullYear()} Wazyo · الجزائر 🇩🇿\nجميع الحقوق محفوظة`
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