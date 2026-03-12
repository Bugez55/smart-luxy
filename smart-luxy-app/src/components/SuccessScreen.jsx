import { openWA } from '../utils/notify'

export default function SuccessScreen({ order, onClose }) {
  return (
    <div className="suc-ov">
      <div className="suc">
        <div className="suc-icon">🎉</div>
        <h2>Commande confirmée !</h2>
        <p>Merci <strong style={{ color: 'white' }}>{order.nom_client}</strong>, votre commande a bien été reçue. Nous vous contacterons au <strong style={{ color: 'white' }}>{order.telephone}</strong> pour confirmer la livraison.</p>

        <div className="suc-id">
          Numéro de commande
          <strong>{order.id}</strong>
        </div>

        <button className="btn-wa-order" style={{ width: '100%' }} onClick={() => openWA(order)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882a.5.5 0 00.61.61l6.098-1.474A11.927 11.927 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-4.994-1.367l-.357-.212-3.718.899.929-3.628-.232-.372A9.796 9.796 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
          </svg>
          Confirmer sur WhatsApp
        </button>

        <button className="suc-close" onClick={onClose}>Retour à la boutique</button>
      </div>
    </div>
  )
}
