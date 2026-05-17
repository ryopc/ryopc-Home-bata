const fs = require('fs');
const path = require('path');
const https = require('https');

// 環境変数から設定を読み込む
const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = process.env.MICROCMS_API_KEY;

// 安全にAPIからデータを取得するための関数
function fetchFromMicroCMS(url, key) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 'X-MICROCMS-API-KEY': key }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('JSONの解析に失敗しました。レスポンスが空か不正です。'));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function buildBlog() {
  // 環境変数のチェック
  if (!serviceDomain || !apiKey) {
      console.error('【エラー】環境変数 MICROCMS_SERVICE_DOMAIN または MICROCMS_API_KEY が設定されていません。');
      return;
  }

  // 末尾のエンドポイント名を「blog」に変更しました
  const url = `https://${serviceDomain}.microcms.io/api/v1/blog`;

  try {
    // 1. マイクロCMSから記事一覧を取得
    const data = await fetchFromMicroCMS(url, apiKey);
    
    // 2. レスポンスの構造チェック
    if (!data || !data.contents || !Array.isArray(data.contents)) {
        console.error('【エラー】マイクロCMSからのデータ構造が正しくありません。取得データ:', data);
        return;
    }

    const articles = data.contents; // 記事データの配列

    // 3. 記事一覧カードを組み立てる
    let articleCards = '';
    articles.forEach(article => {
      const dateStr = article.publishedAt ? article.publishedAt.split('T')[0] : 
                      (article.createdAt ? article.createdAt.split('T')[0] : '日付不明');

      articleCards += `
        <article class="card" onclick="window.location.href='/articles/${article.id}.html'" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <h2 style="margin: 0;">${article.title}</h2>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 600;">${dateStr}</span>
            </div>
            <div style="margin-top: 1.5rem; text-align: right;">
                <a href="/articles/${article.id}.html" style="color: var(--primary); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                    続きを読む ➔
                </a>
            </div>
        </article>
      `;
    });

    if (articles.length === 0) {
        articleCards = `
        <section class="card">
            <h2>No Articles</h2>
            <p>現在、投稿された記事はありません。</p>
        </section>
        `;
    }

    // 4. 全体のHTMLテンプレートを作る
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Blog - ryopc Global Digital Support</title>
    
    <link rel="icon" type="image/png" href="../favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary: #0052cc;
            --primary-light: #0764f1;
            --dark: #0a192f;
            --dark-light: #172a45;
            --accent: #00bfff;
            --bg: #f8fafc;
            --text: #334155;
            --text-light: #94a3b8;
            --white: #ffffff;
            --glass: rgba(13, 29, 52, 0.9);
            --transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
            --gradient-accent: linear-gradient(135deg, #00bfff, #0052cc);
            --gradient-orange: linear-gradient(135deg, #ff5000, #ff8c00);
        }
        
        * { box-sizing: border-box; outline: none; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
        
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            margin: 0; padding: 0;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        #scroll-progress {
            position: fixed; top: 0; left: 0; width: 0%; height: 4px;
            background: var(--gradient-accent);
            z-index: 1000001; transition: width 0.1s;
        }

        .navbar {
            position: fixed; top: 0; left: 0; width: 100%;
            background: var(--glass); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            display: flex; justify-content: space-between; align-items: center;
            padding: 1rem 2.5rem; z-index: 100000;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .nav-logo { color: var(--white); font-weight: 800; font-size: 1.2rem; cursor: pointer; }
        
        .nav-right { display: flex; align-items: center; gap: 2rem; }
        .nav-links { display: flex; gap: 2rem; list-style: none; margin: 0; padding: 0; }
        .nav-links a { color: var(--white); text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: var(--transition); opacity: 0.8; }
        .nav-links a:hover { color: var(--accent); opacity: 1; }

        header {
            background: radial-gradient(circle at top right, var(--dark-light), var(--dark));
            color: var(--white); padding: 12rem 1.5rem 11rem; text-align: center; position: relative; overflow: hidden;
        }

        header h1 {
            margin: 0; font-size: clamp(2.8rem, 10vw, 4.5rem); font-weight: 800;
            background: linear-gradient(135deg, var(--white) 40%, var(--accent));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        header p { font-size: 1.25rem; max-width: 700px; margin: 2rem auto 0; color: var(--text-light); opacity: 0.9; }

        .container { max-width: 900px; margin: -5rem auto 6rem; padding: 0 1.5rem; position: relative; z-index: 10; }
        .card {
            background: var(--white); padding: 2.5rem 3rem; border-radius: 32px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); margin-bottom: 2rem;
            border: 1px solid rgba(226, 232, 240, 0.8); transition: var(--transition);
        }
        .card:hover { transform: translateY(-6px); border-color: var(--accent); }

        h2 { color: var(--dark); font-size: 1.6rem; margin-top: 0; display: flex; align-items: center; gap: 1rem; }
        h2::before { content: ""; display: inline-block; width: 6px; height: 26px; background: var(--gradient-accent); border-radius: 10px; }

        footer { background-color: var(--dark); color: var(--text-light); padding: 6rem 1.5rem 10rem; text-align: center; }
        .status-badge {
            display: inline-flex; align-items: center; gap: 8px; background-color: rgba(30, 41, 59, 0.8);
            color: var(--accent); padding: 0.7rem 1.5rem; border-radius: 100px; font-size: 0.9rem; font-weight: 600;
        }
        .status-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 10px var(--accent); animation: pulse 2s infinite; }

        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

        @media (max-width: 900px) {
            .nav-right { gap: 1rem; }
            .nav-links { display: none; }
            .nav-links.active {
                display: flex; position: absolute; top: 100%; left: 0; width: 100%;
                background: var(--dark); flex-direction: column; padding: 2rem 0;
            }
            .menu-toggle { display: flex; }
        }
    </style>
</head>
<body>

    <div id="scroll-progress"></div>

    <nav class="navbar">
        <div class="nav-logo" onclick="window.location.href='/'">ryopc org</div>
        <div class="nav-right">
            <ul class="nav-links" id="navLinks">
                <li><a href="/">ホーム</a></li>
                <li><a href="/blog/">ブログ一覧</a></li>
                <li><a href="https://docs.ryopc.f5.si">ドキュメント</a></li>
            </ul>
        </div>
    </nav>

    <header>
        <h1>ryopc Blog</h1>
        <p>ryopc org の最新記事・アップデート情報一覧</p>
    </header>

    <div class="container" id="contentContainer">
        ${articleCards}
    </div>

    <footer>
        <p>&copy; 2026 ryopc Global Initiative. All Rights Reserved.</p>
        <div class="status-badge">
            <span class="status-dot"></span>
            <span>Status: Active (Cloudflare Pages)</span>
        </div>
    </footer>

    <script>
        window.onscroll = () => {
            const winScroll = document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.getElementById("scroll-progress").style.width = scrolled + "%";
        };
    </script>
</body>
</html>
    `;

    // 5. blog フォルダ直下に index.html として出力
    const targetDir = path.join(__dirname, 'blog');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent.trim());
    console.log('【成功】blog/index.html を正常に作成しました！');

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  }
}

buildBlog();
