import React, { useEffect, useRef, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";

export default function App() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState(
    parseFloat(localStorage.getItem("highScore")) || 0
  );
  const [gameOver, setGameOver] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const animationRef = useRef(null);
  const gameRunning = useRef(true);

  const player = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - CANVAS_HEIGHT / 8,
    size: 25,
    angle: -Math.PI / 2,
    rotationSpeed: 0.06,
  });

  const bullets = useRef([]);
  const enemies = useRef([]);
  const bombs = useRef([]);
  const keys = useRef({});
  const [ammo, setAmmo] = useState(5);

  const RED_ZONE = {
    x: 0,
    y: CANVAS_HEIGHT - CANVAS_HEIGHT / 4,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT / 4,
  };

  const enemySpawnRate = useRef(2000);
  const enemySpeed = useRef(1.2);

  const endGame = () => {
    if (!gameRunning.current) return;
    gameRunning.current = false;
    cancelAnimationFrame(animationRef.current);
    setGameOver(true);

    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem("highScore", finalScore.toString());
    }
  };

  const restartGame = () => {
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    gameRunning.current = true;
    enemies.current = [];
    bullets.current = [];
    bombs.current = [];
    setAmmo(5);
    loop();
  };

  // Input
  useEffect(() => {
    const handleKeyDown = (e) => (keys.current[e.key] = true);
    const handleKeyUp = (e) => (keys.current[e.key] = false);
    const handleShoot = (e) => {
      if (e.code === "Space" && gameRunning.current && ammo > 0) {
        const p = player.current;
        bullets.current.push({
          x: p.x,
          y: p.y,
          size: 4,
          speed: 7,
          dx: Math.cos(p.angle),
          dy: Math.sin(p.angle),
        });
        setAmmo((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleShoot);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleShoot);
    };
  }, [ammo]);

  // Spawns
  useEffect(() => {
    if (!gameRunning.current) return;
    const spawnEnemy = () => {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) {
        x = Math.random() * CANVAS_WIDTH;
        y = 0;
      } else if (side === 1) {
        x = CANVAS_WIDTH;
        y = Math.random() * (RED_ZONE.y - 10);
      } else if (side === 2) {
        x = Math.random() * CANVAS_WIDTH;
        y = 0;
      } else {
        x = 0;
        y = Math.random() * (RED_ZONE.y - 10);
      }
      enemies.current.push({ x, y, size: 25, speed: enemySpeed.current });
    };

    const spawnBomb = () => {
      bombs.current.push({
        x: CANVAS_WIDTH / 2 + (Math.random() * 250 - 125),
        y: CANVAS_HEIGHT / 2 + (Math.random() * 120 - 60),
        size: 18,
        createdAt: Date.now(),
      });
    };

    const enemyInterval = setInterval(spawnEnemy, enemySpawnRate.current);
    const bombInterval = setInterval(spawnBomb, 9000);

    return () => {
      clearInterval(enemyInterval);
      clearInterval(bombInterval);
    };
  }, [gameOver]);

  // Game loop
  const loop = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let lastTime = performance.now();

    const gameLoop = (time) => {
      if (!gameRunning.current) return;

      const delta = time - lastTime;
      lastTime = time;
      scoreRef.current += delta / 1000;
      setScore(scoreRef.current);

      // Background
      ctx.fillStyle = darkMode ? "#111" : "#f0f0f0";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Red zone
      ctx.strokeStyle = darkMode ? "#ff4c4c" : "#ff0000";
      ctx.lineWidth = 3;
      ctx.strokeRect(RED_ZONE.x, RED_ZONE.y, RED_ZONE.width, RED_ZONE.height);

      const p = player.current;

      if (keys.current["ArrowLeft"]) p.angle -= p.rotationSpeed;
      if (keys.current["ArrowRight"]) p.angle += p.rotationSpeed;

      // Player styled (triangle spaceship)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = darkMode ? "#4db8ff" : "#0055cc";
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-15, -12);
      ctx.lineTo(-15, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Bullets (light beams)
      bullets.current.forEach((b, i) => {
        b.x += b.dx * b.speed;
        b.y += b.dy * b.speed;
        ctx.strokeStyle = darkMode ? "#ffff66" : "#ff6600";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.dx * 5, b.y - b.dy * 5);
        ctx.stroke();
        if (b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
          bullets.current.splice(i, 1);
          setAmmo((prev) => prev + 1);
        }
      });

      // Bombs
      const now = Date.now();
      bombs.current.forEach((bomb, i) => {
        const age = now - bomb.createdAt;
        if (age > 5000) {
          bombs.current.splice(i, 1);
          return;
        }
        let visible = true;
        if (age > 3500) visible = Math.floor((age - 3500) / 150) % 2 === 0;
        if (visible) {
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.arc(bomb.x, bomb.y, bomb.size, 0, Math.PI * 2);
          ctx.fill();
        }
        bullets.current.forEach((b) => {
          const d = Math.hypot(b.x - bomb.x, b.y - bomb.y);
          if (d < bomb.size + b.size) {
            endGame();
          }
        });
      });

      // Enemies (glowing)
      enemies.current.forEach((enemy, i) => {
        const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        ctx.fillStyle = darkMode ? "#00ff99" : "#00994d";
        ctx.shadowBlur = 15;
        ctx.shadowColor = darkMode ? "#00ff99" : "#00994d";
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (dist < (p.size + enemy.size) / 2) {
          endGame();
        }

        bullets.current.forEach((b, j) => {
          const d = Math.hypot(b.x - enemy.x, b.y - enemy.y);
          if (d < enemy.size / 2 + b.size) {
            enemies.current.splice(i, 1);
            bullets.current.splice(j, 1);
            setAmmo((prev) => prev + 1);
          }
        });
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    loop();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <div style={{ textAlign: "center", background: darkMode ? "#222" : "#fff", minHeight: "100vh", color: darkMode ? "#fff" : "#000", transition: "0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 30px" }}>
        <h2>Survival Shooter</h2>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            background: "transparent",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: darkMode ? "#fff" : "#333"
          }}
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </div>

      <p>Rotate: ⬅️ ➡️ | Shoot: Space | Ammo: {ammo}</p>
      <p>Score: {Math.floor(score)}s | High Score: {Math.floor(highScore)}s</p>

      <div style={{ position: "relative", display: "inline-block" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            border: "2px solid",
            borderColor: darkMode ? "#888" : "#333",
            background: darkMode ? "#111" : "#eee",
            transition: "0.3s",
          }}
        />

        {gameOver && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.7)",
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "24px",
            }}
          >
            <p>Game Over!</p>
            <p>Score: {Math.floor(score)}s</p>
            <p>High Score: {Math.floor(highScore)}s</p>
            <button
              onClick={restartGame}
              style={{ padding: "10px 20px", fontSize: "18px", cursor: "pointer" }}
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
