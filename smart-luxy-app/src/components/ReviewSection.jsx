// ═══════════════════════════════════════════════════
//  AVIS CLIENTS — affichage public uniquement
//  Les avis sont ajoutés exclusivement par l'administrateur.
// ═══════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function Stars({ note, size = 15 }) {
  return (
    <span aria-label={`${note} sur 5`} style={{ letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{
          color: s <= note ? '#F9A825' : 'var(--g3)',
          fontSize: size,
        }}>★</span>
      ))}
    </span>
  )
}

function Avatar({ nom, photo }) {
  if (photo) return (
    <img
      src={photo}
      alt={nom}
      loading="lazy"
      style={{
        width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
        border: '2px solid rgba(201,168,76,.3)', flexShrink: 0,
      }}
      onError={e => { e.currentTarget.style.display = 'none' }}
    />
  )

  const initials = nom?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const colors = ['#C9A84C', '#E9C46A', '#F4A261', '#2A9D8F', '#457B9D']
  const color = colors[nom?.charCodeAt(0) % colors.length] || colors[0]

  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', background: color + '22',
      border: `2px solid ${color}55`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 15, fontWeight: 800, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export default function ReviewSection({ productId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadReviews() {
      setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select('id, product_id, nom, note, commentaire, photo, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (error) console.error('Erreur chargement avis:', error)
        setReviews(data || [])
        setLoading(false)
      }
    }

    loadReviews()
    return () => { cancelled = true }
  }, [productId])

  const avg = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.note || 0), 0) / reviews.length).toFixed(1)
    : null

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⭐</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--g3)' }}>
            Avis clients
          </span>
          {avg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#F9A825' }}>{avg}</span>
              <span style={{ fontSize: 11, color: 'var(--g3)' }}>({reviews.length})</span>
            </div>
          )}
        </div>
        <span style={{
          fontSize: 10, color: 'rgba(255,255,255,.35)',
          border: '1px solid rgba(255,255,255,.08)', borderRadius: 999,
          padding: '4px 8px',
        }}>
          Avis vérifiés
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--g4)', fontSize: 13 }}>
          Chargement…
        </div>
      ) : reviews.length === 0 ? (
        <div style={{
          padding: '22px 0', textAlign: 'center', color: 'var(--g4)', fontSize: 13,
        }}>
          Aucun avis pour le moment.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {reviews.map(review => (
            <article key={review.id} style={{
              background: 'var(--card2)',
              border: '1px solid rgba(201,168,76,.12)',
              borderRadius: 14,
              padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                <Avatar nom={review.nom} photo={review.photo} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--g3)', fontSize: 13 }}>{review.nom}</strong>
                    <Stars note={Number(review.note || 0)} />
                    <span style={{ fontSize: 10, color: 'var(--g4)' }}>
                      {new Date(review.created_at).toLocaleDateString('fr-DZ')}
                    </span>
                  </div>
                  <p style={{
                    margin: '7px 0 0', color: 'rgba(255,255,255,.72)',
                    fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  }}>
                    {review.commentaire}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
