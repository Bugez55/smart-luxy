import { useMemo } from 'react'

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-DZ') + ' DA'
}

function getGalleryImage(product) {
  if (!product) return ''
  try {
    const images = typeof product.images === 'string'
      ? JSON.parse(product.images)
      : product.images
    if (Array.isArray(images)) {
      const first = images.find(image =>
        (typeof image === 'string' && image.trim()) ||
        (image && typeof image.url === 'string' && image.url.trim())
      )
      if (typeof first === 'string') return first
      if (first?.url) return first.url
    }
  } catch {}
  return product.img || ''
}

export default function ProductGallery({ products = [], onProductClick }) {
  const galleryProducts = useMemo(() => {
    return products
      .filter(product => getGalleryImage(product))
      .slice(0, 10)
  }, [products])

  if (galleryProducts.length < 3) return null

  return (
    <section className="wz-discovery-gallery" aria-label="Autres produits à découvrir">
      <div className="wz-discovery-head">
        <div>
          <span className="wz-discovery-kicker">ENCORE À DÉCOUVRIR</span>
          <h2>D’autres trouvailles vous attendent.</h2>
          <p>Parcourez quelques articles supplémentaires de la boutique.</p>
        </div>
        <span className="wz-discovery-count">{galleryProducts.length} articles</span>
      </div>

      <div className="wz-discovery-track">
        {galleryProducts.map(product => {
          const image = getGalleryImage(product)
          const oldPrice = Number(product.prix_old || 0)
          const price = Number(product.prix || 0)
          const discount = oldPrice > price && price > 0
            ? Math.round((1 - price / oldPrice) * 100)
            : 0
          const outOfStock = product.stock !== null &&
            product.stock !== undefined &&
            product.stock !== '' &&
            Number(product.stock) <= 0

          return (
            <button
              key={product.id}
              type="button"
              className={`wz-discovery-card ${outOfStock ? 'is-out-of-stock' : ''}`}
              onClick={() => !outOfStock && onProductClick(product)}
              disabled={outOfStock}
              aria-label={outOfStock ? `${product.nom}, épuisé` : `Découvrir ${product.nom}`}
            >
              <span className="wz-discovery-image">
                <img src={image} alt="" loading="lazy" decoding="async" />
                {discount > 0 && <span className="wz-discovery-discount">-{discount}%</span>}
                {outOfStock && <span className="wz-discovery-stock">ÉPUISÉ</span>}
              </span>
              <span className="wz-discovery-info">
                <span className="wz-discovery-category">{product.categorie || 'WAZYO'}</span>
                <strong>{product.nom}</strong>
                <span className="wz-discovery-price">
                  {fmt(price)}
                  {oldPrice > price && <del>{fmt(oldPrice)}</del>}
                </span>
              </span>
              <span className="wz-discovery-arrow" aria-hidden="true">↗</span>
            </button>
          )
        })}
      </div>

      <style>{`
        .wz-discovery-gallery{
          position:relative;
          overflow:hidden;
          padding:40px 0 62px;
          border-top:1px solid rgba(213,183,112,.12);
          background:
            radial-gradient(ellipse at 50% 0%,rgba(213,183,112,.075),transparent 45%),
            linear-gradient(180deg,#0b0e14,#080a0f);
        }
        .wz-discovery-head{
          width:min(1320px,100%);
          margin:0 auto 20px;
          padding:0 clamp(15px,2.5vw,28px);
          box-sizing:border-box;
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:18px;
        }
        .wz-discovery-kicker{
          display:block;
          margin-bottom:8px;
          color:#d5b770;
          font-size:9px;
          font-weight:900;
          letter-spacing:.22em;
        }
        .wz-discovery-head h2{
          margin:0;
          color:#f7f4ed;
          font-family:'Outfit',system-ui,sans-serif;
          font-size:clamp(24px,3vw,36px);
          font-weight:800;
          letter-spacing:-.045em;
          line-height:1.05;
        }
        .wz-discovery-head p{
          margin:8px 0 0;
          color:rgba(247,244,237,.52);
          font-size:11px;
          line-height:1.6;
        }
        .wz-discovery-count{
          flex:0 0 auto;
          padding:8px 11px;
          border:1px solid rgba(213,183,112,.20);
          border-radius:999px;
          color:rgba(247,244,237,.65);
          background:rgba(213,183,112,.045);
          font-size:9px;
          font-weight:750;
          letter-spacing:.04em;
        }
        .wz-discovery-track{
          width:100%;
          display:flex;
          gap:13px;
          padding:0 max(14px,calc((100vw - 1264px)/2)) 10px;
          box-sizing:border-box;
          overflow-x:auto;
          overscroll-behavior-x:contain;
          scroll-snap-type:x mandatory;
          scrollbar-width:thin;
          scrollbar-color:rgba(213,183,112,.32) transparent;
          -webkit-overflow-scrolling:touch;
        }
        .wz-discovery-card{
          position:relative;
          flex:0 0 clamp(190px,19vw,238px);
          min-width:0;
          display:flex;
          flex-direction:column;
          padding:7px;
          border:1px solid rgba(213,183,112,.16);
          border-radius:15px;
          background:linear-gradient(155deg,#171a22,#0b0e14);
          color:#f7f4ed;
          text-align:left;
          cursor:pointer;
          scroll-snap-align:start;
          overflow:hidden;
          box-shadow:0 10px 28px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.035);
          transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease;
        }
        .wz-discovery-card:focus-visible{
          outline:2px solid #e5cb8d;
          outline-offset:3px;
        }
        .wz-discovery-card:disabled{cursor:not-allowed;}
        .wz-discovery-image{
          position:relative;
          height:clamp(160px,17vw,205px);
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          border-radius:10px;
          background:
            radial-gradient(ellipse at 50% 43%,rgba(213,183,112,.15),transparent 62%),
            linear-gradient(145deg,#1a1e27,#0e1118);
        }
        .wz-discovery-image img{
          display:block;
          width:100%;
          height:100%;
          object-fit:contain;
          padding:12px;
          box-sizing:border-box;
          filter:drop-shadow(0 13px 18px rgba(0,0,0,.35));
          transition:transform .4s ease;
        }
        .wz-discovery-discount{
          position:absolute;
          top:9px;
          left:9px;
          padding:5px 8px;
          border-radius:6px;
          background:linear-gradient(135deg,#efd493,#c49c54);
          color:#15120c;
          font-size:9px;
          font-weight:950;
        }
        .wz-discovery-stock{
          position:absolute;
          inset:0;
          display:grid;
          place-items:center;
          background:rgba(0,0,0,.56);
          color:#fecaca;
          font-size:10px;
          font-weight:900;
          letter-spacing:.12em;
        }
        .wz-discovery-info{
          min-width:0;
          display:flex;
          flex-direction:column;
          gap:5px;
          padding:12px 8px 8px;
        }
        .wz-discovery-category{
          overflow:hidden;
          color:#d5b770;
          font-size:7px;
          font-weight:900;
          letter-spacing:.16em;
          text-overflow:ellipsis;
          text-transform:uppercase;
          white-space:nowrap;
        }
        .wz-discovery-info strong{
          display:-webkit-box;
          overflow:hidden;
          min-height:2.6em;
          color:#f7f4ed;
          font-size:12px;
          font-weight:750;
          line-height:1.3;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
        }
        .wz-discovery-price{
          display:flex;
          flex-wrap:wrap;
          align-items:baseline;
          gap:8px;
          margin-top:2px;
          color:#e4c77f;
          font-size:15px;
          font-weight:900;
          font-variant-numeric:tabular-nums;
        }
        .wz-discovery-price del{
          color:rgba(247,244,237,.38);
          font-size:9px;
          font-weight:600;
        }
        .wz-discovery-arrow{
          position:absolute;
          right:13px;
          bottom:20px;
          width:25px;
          height:25px;
          display:grid;
          place-items:center;
          border:1px solid rgba(213,183,112,.24);
          border-radius:50%;
          background:rgba(213,183,112,.06);
          color:#e4c77f;
          font-size:12px;
        }
        .wz-discovery-card:hover:not(:disabled){
          transform:translateY(-4px);
          border-color:rgba(213,183,112,.44);
          box-shadow:0 18px 38px rgba(0,0,0,.32),0 0 20px rgba(213,183,112,.045);
        }
        .wz-discovery-card:hover:not(:disabled) .wz-discovery-image img{transform:scale(1.045);}
        .wz-discovery-card.is-out-of-stock{opacity:.64;}
        @media(max-width:640px){
          .wz-discovery-gallery{padding:29px 0 42px;}
          .wz-discovery-head{align-items:flex-start;margin-bottom:14px;}
          .wz-discovery-head h2{font-size:24px;}
          .wz-discovery-head p{font-size:10px;}
          .wz-discovery-count{font-size:8px;padding:7px 9px;}
          .wz-discovery-track{gap:9px;padding:0 12px 8px;}
          .wz-discovery-card{flex-basis:166px;border-radius:13px;padding:6px;}
          .wz-discovery-image{height:148px;}
          .wz-discovery-image img{padding:8px;}
          .wz-discovery-info{padding:10px 6px 7px;}
          .wz-discovery-info strong{font-size:11px;}
          .wz-discovery-price{font-size:13px;}
          .wz-discovery-arrow{right:9px;bottom:15px;width:21px;height:21px;}
        }
        @media(prefers-reduced-motion:reduce){
          .wz-discovery-card,.wz-discovery-image img{transition:none!important;}
        }
      `}</style>
    </section>
  )
}
