export default function Spinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="text-5xl animate-bounce">🙏</div>
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  )
}
