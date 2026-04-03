import { QRCodeSVG } from 'qrcode.react'

export default function UpiQR({ amount }) {
  const upiId   = import.meta.env.VITE_UPI_ID   || 'yourupi@bank'
  const upiName = import.meta.env.VITE_UPI_NAME || 'GaneshMandal2026'

  const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=Ganeshotsav2026`

  return (
    <div className="flex flex-col items-center bg-white rounded-2xl border-2 border-orange-200 p-4 mt-3">
      <p className="text-sm font-semibold text-gray-600 mb-3">
        📱 Scan to Pay ₹{amount}
      </p>
      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <QRCodeSVG
          value={upiString}
          size={180}
          fgColor="#1a1a1a"
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="text-xs text-gray-400 mt-2 font-mono">{upiId}</p>
      <p className="text-xs text-gray-400">Google Pay • PhonePe • Paytm</p>
    </div>
  )
}
