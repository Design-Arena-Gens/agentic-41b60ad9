import { useEffect, useRef, useState } from 'react'

export default function Game() {
  const canvasRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const gameStateRef = useRef({
    player: { x: 0, y: 0, width: 40, height: 40, speed: 8 },
    bullets: [],
    enemies: [],
    particles: [],
    score: 0,
    lastShot: 0,
    lastEnemy: 0,
    touchX: null,
    animationId: null,
    canvas: null,
    ctx: null
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const game = gameStateRef.current

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      game.player.x = canvas.width / 2 - game.player.width / 2
      game.player.y = canvas.height - 100
    }

    resize()
    window.addEventListener('resize', resize)

    game.canvas = canvas
    game.ctx = ctx

    const handleTouchStart = (e) => {
      e.preventDefault()
      if (!started) {
        setStarted(true)
        setGameOver(false)
        setScore(0)
        game.score = 0
        game.bullets = []
        game.enemies = []
        game.particles = []
        game.player.x = canvas.width / 2 - game.player.width / 2
        game.player.y = canvas.height - 100
        startGame()
      }
      const touch = e.touches[0]
      game.touchX = touch.clientX
    }

    const handleTouchMove = (e) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        game.touchX = touch.clientX
      }
    }

    const handleTouchEnd = (e) => {
      e.preventDefault()
      if (e.touches.length === 0) {
        game.touchX = null
      }
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
    canvas.addEventListener('click', handleTouchStart)
    canvas.addEventListener('mousemove', (e) => {
      if (started && !gameOver) {
        game.touchX = e.clientX
      }
    })

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      if (game.animationId) {
        cancelAnimationFrame(game.animationId)
      }
    }
  }, [started, gameOver])

  const startGame = () => {
    const game = gameStateRef.current

    const gameLoop = (timestamp) => {
      const canvas = game.canvas
      const ctx = game.ctx

      ctx.fillStyle = '#0a0e27'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Stars background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      for (let i = 0; i < 50; i++) {
        const x = (i * 37 + timestamp * 0.01) % canvas.width
        const y = (i * 53) % canvas.height
        ctx.fillRect(x, y, 2, 2)
      }

      // Update player position
      if (game.touchX !== null) {
        const targetX = game.touchX - game.player.width / 2
        const dx = targetX - game.player.x
        game.player.x += dx * 0.15
        game.player.x = Math.max(0, Math.min(canvas.width - game.player.width, game.player.x))
      }

      // Auto shoot bullets
      if (timestamp - game.lastShot > 200) {
        game.bullets.push({
          x: game.player.x + game.player.width / 2 - 3,
          y: game.player.y,
          width: 6,
          height: 20,
          speed: 10
        })
        game.lastShot = timestamp
      }

      // Spawn enemies
      if (timestamp - game.lastEnemy > 1000) {
        const size = 30 + Math.random() * 30
        game.enemies.push({
          x: Math.random() * (canvas.width - size),
          y: -size,
          width: size,
          height: size,
          speed: 2 + Math.random() * 3,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`
        })
        game.lastEnemy = timestamp
      }

      // Update bullets
      game.bullets = game.bullets.filter(bullet => {
        bullet.y -= bullet.speed
        return bullet.y > -bullet.height
      })

      // Update enemies
      game.enemies = game.enemies.filter(enemy => {
        enemy.y += enemy.speed
        return enemy.y < canvas.height + enemy.height
      })

      // Collision detection
      game.bullets.forEach((bullet, bIndex) => {
        game.enemies.forEach((enemy, eIndex) => {
          if (
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y
          ) {
            // Create explosion particles
            for (let i = 0; i < 15; i++) {
              game.particles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                color: enemy.color
              })
            }

            game.bullets.splice(bIndex, 1)
            game.enemies.splice(eIndex, 1)
            game.score += 10
            setScore(game.score)
          }
        })
      })

      // Check player collision with enemies
      game.enemies.forEach(enemy => {
        if (
          game.player.x < enemy.x + enemy.width &&
          game.player.x + game.player.width > enemy.x &&
          game.player.y < enemy.y + enemy.height &&
          game.player.y + game.player.height > enemy.y
        ) {
          setGameOver(true)
          setStarted(false)
          cancelAnimationFrame(game.animationId)
        }
      })

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.02
        return p.life > 0
      })

      // Draw particles
      game.particles.forEach(p => {
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life
        ctx.fillRect(p.x, p.y, 4, 4)
      })
      ctx.globalAlpha = 1

      // Draw bullets
      ctx.fillStyle = '#00ffff'
      game.bullets.forEach(bullet => {
        ctx.shadowBlur = 10
        ctx.shadowColor = '#00ffff'
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      })
      ctx.shadowBlur = 0

      // Draw enemies
      game.enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color
        ctx.shadowBlur = 10
        ctx.shadowColor = enemy.color
        ctx.beginPath()
        ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.shadowBlur = 0

      // Draw player
      ctx.fillStyle = '#00ff00'
      ctx.shadowBlur = 15
      ctx.shadowColor = '#00ff00'
      ctx.beginPath()
      ctx.moveTo(game.player.x + game.player.width / 2, game.player.y)
      ctx.lineTo(game.player.x, game.player.y + game.player.height)
      ctx.lineTo(game.player.x + game.player.width, game.player.y + game.player.height)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0

      game.animationId = requestAnimationFrame(gameLoop)
    }

    game.animationId = requestAnimationFrame(gameLoop)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0e27' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold',
        textShadow: '0 0 10px rgba(0,255,255,0.8)',
        pointerEvents: 'none'
      }}>
        Score: {score}
      </div>

      {!started && !gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          pointerEvents: 'none'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textShadow: '0 0 20px rgba(0,255,255,0.8)' }}>
            SPACE SHOOTER
          </h1>
          <p style={{ fontSize: '24px', opacity: 0.8 }}>Tap to Start</p>
          <p style={{ fontSize: '16px', marginTop: '20px', opacity: 0.6 }}>
            Touch/drag to move • Auto fire
          </p>
        </div>
      )}

      {gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          pointerEvents: 'none'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#ff0000', textShadow: '0 0 20px rgba(255,0,0,0.8)' }}>
            GAME OVER
          </h1>
          <p style={{ fontSize: '32px', marginBottom: '20px' }}>Score: {score}</p>
          <p style={{ fontSize: '24px', opacity: 0.8 }}>Tap to Restart</p>
        </div>
      )}
    </div>
  )
}
