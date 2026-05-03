import { useNavigate } from 'react-router-dom'
import './PaymentPage.css'

const LOGO_URL =
  'https://github.com/user-attachments/assets/fe1cfef5-afeb-4da7-8421-b129b00ab1a0'

export default function PaymentPage() {
  const navigate = useNavigate()

  return (
    <div className="payment-page">
      {/* Header */}
      <header className="payment-header">
        <img src={LOGO_URL} alt="UKAR – קבוצת WA קריוקי" className="payment-logo" />
        <div className="payment-header-text">
          <h1 className="payment-title">UKAR Karaoke</h1>
          <p className="payment-subtitle">קבוצת WA קריוקי</p>
        </div>
      </header>

      {/* Hero */}
      <section className="payment-hero">
        <div className="payment-hero-content">
          <h2 className="payment-hero-title">🎤 קובץ קריוקי אישי מכל שיר</h2>
          <p className="payment-hero-desc">
            שלמו 5 ₪ וקבלו קובץ סאונד קריוקי מותאם אישית מכל שיר ביוטיוב.
            <br />
            פשוט, מהיר, וישירות אליכם!
          </p>

          <div className="payment-steps">
            <div className="step">
              <span className="step-num">1</span>
              <span className="step-text">שלמו 5 ₪ בטופס למטה</span>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <span className="step-num">2</span>
              <span className="step-text">הכניסו לינק יוטיוב ופרטי קשר</span>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <span className="step-num">3</span>
              <span className="step-text">קבלו את קובץ הקריוקי שלכם</span>
            </div>
          </div>
        </div>
      </section>

      {/* Payment section */}
      <section className="payment-section">
        <div className="payment-card">
          <div className="payment-price">
            <span className="price-amount">₪5</span>
            <span className="price-label">לקובץ סאונד קריוקי</span>
          </div>

          <div className="payment-features">
            <div className="feature">🎵 המרת כל שיר יוטיוב לקריוקי</div>
            <div className="feature">📱 קבלה ישירה לנייד</div>
            <div className="feature">⚡ עיבוד מהיר</div>
          </div>

          {/* UPay payment form */}
          <form
            name="upayform"
            action="https://app.upay.co.il/API6/clientsecure/redirectpage.php"
            method="post"
            className="upay-form"
          >
            <input type="hidden" value="ipadtal@gmail.com" name="email" />
            <input type="hidden" value="5" name="amount" />
            <input type="hidden" value="https://youkar.vercel.app/request" name="returnurl" />
            <input type="hidden" value="" name="ipnurl" />
            <input type="hidden" value="קובץ סאונד" name="paymentdetails" />
            <input type="hidden" value="1" name="maxpayments" />
            <input type="hidden" value="1" name="livesystem" />
            <input type="hidden" value="" name="commissionreduction" />
            <input type="hidden" value="1" name="createinvoiceandreceipt" />
            <input type="hidden" value="0" name="createinvoice" />
            <input type="hidden" value="0" name="createreceipt" />
            <input type="hidden" value="UPAY" name="refername" />
            <input type="hidden" value="EN" name="lang" />
            <input type="hidden" value="NIS" name="currency" />
            <input
              type="image"
              src="https://app.upay.co.il/BANKRESOURCES/UPAY/images/buttons/payment-button1EN.png"
              name="submit"
              alt="Make payments with upay"
              className="upay-btn"
            />
          </form>

          <div className="payment-secure">
            🔒 תשלום מאובטח דרך UPay
          </div>
        </div>
      </section>

      {/* Already paid */}
      <section className="already-paid-section">
        <p className="already-paid-text">כבר שילמתם?</p>
        <button
          className="already-paid-btn"
          onClick={() => navigate('/request')}
        >
          לחצו כאן להגשת הבקשה ←
        </button>
      </section>
    </div>
  )
}
