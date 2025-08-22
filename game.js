 // Основные переменные игры
        let gameActive = false;
        let score = 0;
        let playerSize = 10;
        let particles = [];
        let enemies = [];
        let environment = [];
        let animationId = null;
        
        // Элементы DOM
        const scoreElement = document.getElementById('score');
        const sizeElement = document.getElementById('size');
        const speedElement = document.getElementById('speed');
        const instructionsElement = document.getElementById('instructions');
        const gameOverElement = document.getElementById('game-over');
        const finalScoreElement = document.getElementById('final-score');
        
        // Инициализация canvas
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        function resizeCanvas() {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Игрок
        const player = {
            segments: [],
            color: '#00ffaa',
            baseSpeed: 3.5,
            speed: 3.5,
            angle: 0,
            glow: 15,
            boost: false,
            boostEnergy: 100,
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            
            init: function() {
                this.segments = [];
                for (let i = 0; i < playerSize; i++) {
                    this.segments.push({
                        x: canvas.width/2 - i * 3,
                        y: canvas.height/2
                    });
                }
                this.x = canvas.width/2;
                this.y = canvas.height/2;
                this.targetX = canvas.width/2;
                this.targetY = canvas.height/2;
                this.updateSpeed();
            },
            
            updateSpeed: function() {
                // Чем больше змея, тем медленнее скорость (но не менее 40% от базовой)
                const sizeFactor = Math.max(0.4, 1 - (this.segments.length - 10) * 0.02);
                this.speed = this.baseSpeed * sizeFactor;
                speedElement.textContent = Math.round(sizeFactor * 100) + '%';
            },
            
            update: function() {
                // Обновляем позицию головы на основе мыши/касания
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) {
                    this.angle = Math.atan2(dy, dx);
                    const moveSpeed = this.boost ? this.speed * 1.8 : this.speed;
                    this.x += Math.cos(this.angle) * moveSpeed;
                    this.y += Math.sin(this.angle) * moveSpeed;
                }
                
                // Обновляем сегменты
                this.segments[0].x = this.x;
                this.segments[0].y = this.y;
                
                for (let i = 1; i < this.segments.length; i++) {
                    const prev = this.segments[i - 1];
                    const segment = this.segments[i];
                    
                    const dx = prev.x - segment.x;
                    const dy = prev.y - segment.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const targetDist = 3;
                    
                    if (dist > targetDist) {
                        segment.x += dx / dist * (dist - targetDist) * 0.3;
                        segment.y += dy / dist * (dist - targetDist) * 0.3;
                    }
                }
                
                // Управление бустом
                if (this.boost && this.boostEnergy > 0) {
                    this.boostEnergy -= 1.5;
                    if (this.boostEnergy <= 0) {
                        this.boost = false;
                    }
                } else if (!this.boost && this.boostEnergy < 100) {
                    this.boostEnergy += 0.5;
                }
            },
            
            draw: function() {
                // Рендер тела
                for (let i = 0; i < this.segments.length; i++) {
                    const segment = this.segments[i];
                    const size = Math.max(3, 8 - i * 0.2);
                    
                    ctx.beginPath();
                    ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2);
                    
                    const gradient = ctx.createRadialGradient(
                        segment.x, segment.y, 0,
                        segment.x, segment.y, size + this.glow
                    );
                    gradient.addColorStop(0, this.color);
                    gradient.addColorStop(0.7, this.color + '80');
                    gradient.addColorStop(1, this.color + '00');
                    
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }
                
                // Рендер эффекта буста
                if (this.boost) {
                    for (let i = 0; i < 5; i++) {
                        const segment = this.segments[this.segments.length - 1];
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.random() * 15;
                        const size = Math.random() * 3 + 1;
                        
                        const x = segment.x + Math.cos(angle) * distance;
                        const y = segment.y + Math.sin(angle) * distance;
                        
                        ctx.beginPath();
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(0, 200, 255, ${0.7 - i * 0.14})`;
                        ctx.fill();
                    }
                }
            },
            
            checkCollision: function() {
                // Проверка столкновений с врагами
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    
                    for (let i = 0; i < enemy.segments.length; i++) {
                        const segment = enemy.segments[i];
                        const dx = this.x - segment.x;
                        const dy = this.y - segment.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < 10) {
                            // Определяем, кто больше
                            if (this.segments.length > enemy.segments.length * 1.1) {
                                // Игрок больше - поглощаем врага
                                score += enemy.segments.length * 2;
                                playerSize += enemy.segments.length * 0.3;
                                
                                // Создаем частицы из врага
                                createParticlesFromEnemy(enemy);
                                
                                // Удаляем врага
                                enemies.splice(j, 1);
                                createEnemies(1);
                                
                                // Обновляем скорость
                                this.updateSpeed();
                                updateScore();
                                
                                // Эффект поглощения
                                createCollisionEffect(enemy.x, enemy.y, true);
                                
                                return false;
                            } else if (enemy.segments.length > this.segments.length * 1.1) {
                                // Враг больше - игрок погибает
                                createParticlesFromPlayer();
                                return true;
                            } else {
                                // Примерно равны - отталкивание
                                createCollisionEffect(enemy.x, enemy.y, false);
                                const angle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
                                this.x += Math.cos(angle) * 10;
                                this.y += Math.sin(angle) * 10;
                                return false;
                            }
                        }
                    }
                }
                
                return false;
            }
        };
        
        // Создание частиц из врага при поглощении
        function createParticlesFromEnemy(enemy) {
            const particleCount = Math.min(enemy.segments.length * 2, 50);
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30;
                
                particles.push({
                    x: enemy.x + Math.cos(angle) * distance,
                    y: enemy.y + Math.sin(angle) * distance,
                    radius: Math.random() * 3 + 2,
                    color: enemy.color,
                    glow: Math.random() * 8 + 4,
                    energy: 1
                });
            }
        }
        
        // Создание частиц из игрока при смерти
        function createParticlesFromPlayer() {
            const particleCount = Math.min(player.segments.length * 3, 100);
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 50;
                
                particles.push({
                    x: player.x + Math.cos(angle) * distance,
                    y: player.y + Math.sin(angle) * distance,
                    radius: Math.random() * 4 + 2,
                    color: player.color,
                    glow: Math.random() * 10 + 5,
                    energy: Math.random() > 0.8 ? 3 : 1
                });
            }
        }
        
        // Эффект столкновения
        function createCollisionEffect(x, y, isAbsorption) {
            const effect = document.createElement('div');
            effect.className = 'collision-effect';
            effect.style.width = isAbsorption ? '100px' : '150px';
            effect.style.height = isAbsorption ? '100px' : '150px';
            effect.style.left = (x - (isAbsorption ? 50 : 75)) + 'px';
            effect.style.top = (y - (isAbsorption ? 50 : 75)) + 'px';
            
            if (isAbsorption) {
                effect.style.background = 'radial-gradient(circle, rgba(0, 255, 150, 0.8) 0%, transparent 70%)';
            }
            
            document.getElementById('game-container').appendChild(effect);
            
            setTimeout(() => {
                effect.remove();
            }, 500);
        }
        
        // Создание частиц (еды)
        function createParticles(count) {
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 4 + 2,
                    color: getRandomParticleColor(),
                    glow: Math.random() * 10 + 5,
                    energy: Math.random() > 0.9 ? 5 : 1
                });
            }
        }
        
        // Создание врагов
        function createEnemies(count) {
            for (let i = 0; i < count; i++) {
                const length = Math.floor(Math.random() * 30) + 5;
                const segments = [];
                const startX = Math.random() * canvas.width;
                const startY = Math.random() * canvas.height;
                
                for (let j = 0; j < length; j++) {
                    segments.push({
                        x: startX - j * 3,
                        y: startY
                    });
                }
                
                const baseSpeed = 3.5;
                const speed = baseSpeed * Math.max(0.4, 1 - (length - 10) * 0.02);
                
                enemies.push({
                    segments: segments,
                    color: getRandomEnemyColor(),
                    baseSpeed: baseSpeed,
                    speed: speed,
                    angle: Math.random() * Math.PI * 2,
                    glow: Math.random() * 10 + 5,
                    x: startX,
                    y: startY,
                    targetX: startX,
                    targetY: startY,
                    changeDirectionTime: 0
                });
            }
        }
        
        // Создание элементов окружения
        function createEnvironment(count) {
            for (let i = 0; i < count; i++) {
                environment.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 100 + 50,
                    color: getRandomEnvironmentColor(),
                    pulse: Math.random() * 0.02
                });
            }
        }
        
        // Вспомогательные функции
        function getRandomParticleColor() {
            const colors = ['#00c8ff', '#00ffaa', '#7700ff', '#ff00cc'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        function getRandomEnemyColor() {
            const colors = ['#ff3366', '#ff9900', '#cc00ff', '#ff0066'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        function getRandomEnvironmentColor() {
            const colors = ['#0044ff', '#ff00aa', '#00ffcc', '#aa00ff'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        // Инициализация игры
        function initGame() {
            particles = [];
            enemies = [];
            environment = [];
            
            player.init();
            createParticles(150);
            createEnemies(8);
            createEnvironment(5);
            
            score = 0;
            playerSize = 10;
            updateScore();
            
            gameActive = true;
            instructionsElement.style.display = 'none';
            gameOverElement.style.display = 'none';
            
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            animate();
        }
        
        // Основной цикл анимации
        function animate() {
            if (!gameActive) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Рендер фона
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
            );
            gradient.addColorStop(0, '#0a0a2a');
            gradient.addColorStop(1, '#0c1c3d');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Рендер окружения
            environment.forEach(elem => {
                const pulse = Math.sin(Date.now() * elem.pulse) * 0.2 + 0.8;
                const radius = elem.radius * pulse;
                
                const gradient = ctx.createRadialGradient(
                    elem.x, elem.y, 0,
                    elem.x, elem.y, radius
                );
                gradient.addColorStop(0, elem.color + '40');
                gradient.addColorStop(1, 'transparent');
                
                ctx.beginPath();
                ctx.arc(elem.x, elem.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            });
            
            // Обновление и рендер врагов
            enemies.forEach(enemy => {
                // ИИ врагов
                enemy.changeDirectionTime--;
                if (enemy.changeDirectionTime <= 0) {
                    enemy.angle = Math.random() * Math.PI * 2;
                    enemy.changeDirectionTime = Math.random() * 100 + 50;
                }
                
                enemy.x += Math.cos(enemy.angle) * enemy.speed;
                enemy.y += Math.sin(enemy.angle) * enemy.speed;
                
                // Ограничение движения в пределах canvas
                if (enemy.x < 0) enemy.angle = Math.PI - enemy.angle;
                if (enemy.x > canvas.width) enemy.angle = Math.PI - enemy.angle;
                if (enemy.y < 0) enemy.angle = -enemy.angle;
                if (enemy.y > canvas.height) enemy.angle = -enemy.angle;
                
                // Обновление сегментов
                enemy.segments[0].x = enemy.x;
                enemy.segments[0].y = enemy.y;
                
                for (let i = 1; i < enemy.segments.length; i++) {
                    const prev = enemy.segments[i - 1];
                    const segment = enemy.segments[i];
                    
                    const dx = prev.x - segment.x;
                    const dy = prev.y - segment.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const targetDist = 3;
                    
                    if (dist > targetDist) {
                        segment.x += dx / dist * (dist - targetDist) * 0.3;
                        segment.y += dy / dist * (dist - targetDist) * 0.3;
                    }
                }
                
                // Рендер врага
                for (let i = 0; i < enemy.segments.length; i++) {
                    const segment = enemy.segments[i];
                    const size = Math.max(2, 6 - i * 0.2);
                    
                    ctx.beginPath();
                    ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2);
                    
                    const gradient = ctx.createRadialGradient(
                        segment.x, segment.y, 0,
                        segment.x, segment.y, size + enemy.glow
                    );
                    gradient.addColorStop(0, enemy.color);
                    gradient.addColorStop(0.7, enemy.color + '80');
                    gradient.addColorStop(1, enemy.color + '00');
                    
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }
            });
            
            // Рендер частиц
            particles.forEach(particle => {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.radius + particle.glow
                );
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(0.7, particle.color + '80');
                gradient.addColorStop(1, particle.color + '00');
                
                ctx.fillStyle = gradient;
                ctx.fill();
            });
            
            // Обновление и рендер игрока
            player.update();
            player.draw();
            
            // Проверка сбора частиц
            checkParticleCollision();
            
            // Проверка столкновений
            if (player.checkCollision()) {
                gameOver();
                return;
            }
            
            animationId = requestAnimationFrame(animate);
        }
        
        // Проверка сбора частиц
        function checkParticleCollision() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                const dx = player.x - particle.x;
                const dy = player.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 15) {
                    // Сбор частицы
                    score += particle.energy;
                    playerSize += particle.energy * 0.2;
                    
                    // Добавление нового сегмента
                    const lastSegment = player.segments[player.segments.length - 1];
                    for (let j = 0; j < particle.energy; j++) {
                        player.segments.push({
                            x: lastSegment.x,
                            y: lastSegment.y
                        });
                    }
                    
                    // Обновление скорости
                    player.updateSpeed();
                    
                    // Создание эффекта поглощения
                    createAbsorptionEffect(particle.x, particle.y, particle.color);
                    
                    // Удаление частицы и добавление новой
                    particles.splice(i, 1);
                    createParticles(1);
                    
                    updateScore();
                }
            }
        }
        
        // Создание эффекта поглощения энергии
        function createAbsorptionEffect(x, y, color) {
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 1;
                const size = Math.random() * 2 + 1;
                
                setTimeout(() => {
                    if (!gameActive) return;
                    
                    let currentX = x;
                    let currentY = y;
                    const dx = player.x - x;
                    const dy = player.y - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const steps = distance / speed;
                    const stepDx = dx / steps;
                    const stepDy = dy / steps;
                    
                    const drawTrail = () => {
                        if (!gameActive) return;
                        
                        currentX += stepDx;
                        currentY += stepDy;
                        
                        ctx.beginPath();
                        ctx.arc(currentX, currentY, size, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();
                        
                        const currentDistance = Math.sqrt(
                            Math.pow(player.x - currentX, 2) + 
                            Math.pow(player.y - currentY, 2)
                        );
                        
                        if (currentDistance > 5) {
                            requestAnimationFrame(drawTrail);
                        }
                    };
                    
                    drawTrail();
                }, i * 50);
            }
        }
        
        // Обновление счета
        function updateScore() {
            scoreElement.textContent = Math.floor(score);
            sizeElement.textContent = Math.floor(player.segments.length);
        }
        
        // Конец игры
        function gameOver() {
            gameActive = false;
            finalScoreElement.textContent = Math.floor(score);
            gameOverElement.style.display = 'block';
            
            // Создание эффекта взрыва
            for (let i = 0; i < player.segments.length; i++) {
                const segment = player.segments[i];
                
                for (let j = 0; j < 3; j++) {
                    setTimeout(() => {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 3 + 1;
                        const size = Math.random() * 3 + 1;
                        
                        let currentX = segment.x;
                        let currentY = segment.y;
                        let currentSize = size;
                        
                        const drawExplosion = () => {
                            ctx.beginPath();
                            ctx.arc(currentX, currentY, currentSize, 0, Math.PI * 2);
                            ctx.fillStyle = `rgba(255, ${50 + Math.random() * 100}, ${100 + Math.random() * 100}, 0.7)`;
                            ctx.fill();
                            
                            currentX += Math.cos(angle) * speed;
                            currentY += Math.sin(angle) * speed;
                            currentSize -= 0.1;
                            
                            if (currentSize > 0) {
                                requestAnimationFrame(drawExplosion);
                            }
                        };
                        
                        drawExplosion();
                    }, i * 10 + j * 5);
                }
            }
        }
        
        // Перезапуск игры
        function restartGame() {
            initGame();
        }
        
        // Обработчики событий
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            player.targetX = e.clientX - rect.left;
            player.targetY = e.clientY - rect.top;
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            player.targetX = e.touches[0].clientX - rect.left;
            player.targetY = e.touches[0].clientY - rect.top;
        }, { passive: false });
        
        canvas.addEventListener('click', () => {
            if (!gameActive) {
                initGame();
            }
        });
        
        canvas.addEventListener('touchstart', () => {
            if (!gameActive) {
                initGame();
            }
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && gameActive) {
                player.boost = true;
                e.preventDefault();
            }
            
            if (e.code === 'KeyR') {
                restartGame();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                player.boost = false;
            }
        });
        
        // Первоначальная инициализация
        player.init();
        createParticles(150);
        createEnemies(8);
        createEnvironment(5);
        
        // Первоначальная отрисовка статичной сцены
        drawStaticScene();
        
        function drawStaticScene() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Рендер фона
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
            );
            gradient.addColorStop(0, '#0a0a2a');
            gradient.addColorStop(1, '#0c1c3d');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Рендер окружения
            environment.forEach(elem => {
                const pulse = Math.sin(Date.now() * elem.pulse) * 0.2 + 0.8;
                const radius = elem.radius * pulse;
                
                const gradient = ctx.createRadialGradient(
                    elem.x, elem.y, 0,
                    elem.x, elem.y, radius
                );
                gradient.addColorStop(0, elem.color + '40');
                gradient.addColorStop(1, 'transparent');
                
                ctx.beginPath();
                ctx.arc(elem.x, elem.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            });
            
            // Рендер частиц
            particles.forEach(particle => {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.radius + particle.glow
                );
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(0.7, particle.color + '80');
                gradient.addColorStop(1, particle.color + '00');
                
                ctx.fillStyle = gradient;
                ctx.fill();
            });
            
            // Рендер врагов (статичных)
            enemies.forEach(enemy => {
                for (let i = 0; i < enemy.segments.length; i++) {
                    const segment = enemy.segments[i];
                    const size = Math.max(2, 6 - i * 0.2);
                    
                    ctx.beginPath();
                    ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2);
                    
                    const gradient = ctx.createRadialGradient(
                        segment.x, segment.y, 0,
                        segment.x, segment.y, size + enemy.glow
                    );
                    gradient.addColorStop(0, enemy.color);
                    gradient.addColorStop(0.7, enemy.color + '80');
                    gradient.addColorStop(1, enemy.color + '00');
                    
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }
            });
            
            // Рендер игрока (статичного)
            for (let i = 0; i < player.segments.length; i++) {
                const segment = player.segments[i];
                const size = Math.max(3, 8 - i * 0.2);
                
                ctx.beginPath();
                ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2);
                
                const gradient = ctx.createRadialGradient(
                    segment.x, segment.y, 0,
                    segment.x, segment.y, size + player.glow
                );
                gradient.addColorStop(0, player.color);
                gradient.addColorStop(0.7, player.color + '80');
                gradient.addColorStop(1, player.color + '00');
                
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        }