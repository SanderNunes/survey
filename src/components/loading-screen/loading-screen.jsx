import { useEffect, useState } from "react"
import "./loading-screen.css"

// const pacifico = Pacifico({
//   weight: "400",
//   subsets: ["latin"],
//   display: "swap",
// })

export default function LoadingScreen() {
  const [mounted, setMounted] = useState(false)
  const text = "Africell"

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute top-0 w-screen h-screen z-10">

    <div className="loading-container">
      <div className={`loading-text`} style={{ fontFamily: 'DK Coal Brush' }}>
        {text.split("").map((letter, index) => (
          <span
            key={index}
            className="loading-letter"
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
    </div>

  )
}
