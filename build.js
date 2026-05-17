const fs = require('fs');
const path = require('path');

// 🔒 Cloudflare Pagesのビルド画面から注入される環境変数を読み込む
const API_KEY = process.env.MICROCMS_API_KEY;
const SERVICE_DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN;

async function buildBlog() {
  const targetDir = path.join(__dirname, 'blog', 'articles');

  try {
    // 1. ビルドの裏側でmicroCMSから安全に記事を取得
    const response = await fetch(`https://${SERVICE_DOMAIN}.microcms.io/api/v1/blog`, {
      headers: { "X-MICROCMS-API-KEY": API_KEY }
    });
    const data = await response.json();

    // 2. 記事の数だけループして「フォルダ / index.html」を自動生成する
    for (const post of data.contents) {
      // 記事ごとの専用フォルダを作る（例: blog/articles/entry1）
      const postDir = path.join(targetDir, post.id); 
      fs.mkdirSync(postDir, { recursive: true });

      // ドットHTMLなしで表示させるための index.html の中身を組み立てる
      const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${post.title}</title>
  <style>body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }</style>
</head>
<body>
  <h1>${post.title}</h1>
  <p style="color:#666;">公開日: ${new Date(post.createdAt).toLocaleDateString('ja-JP')}</p>
  <hr>
  <div>${post.body}</div>
  <p><a href="/blog">← ブログ一覧へ戻る</a></p>
</body>
</html>`;

      // フォルダの中に index.html として書き出す
      fs.writeFileSync(path.join(postDir, 'index.html'), htmlContent);
      console.log(`生成完了: /blog/articles/${post.id}`);
    }

  } catch (error) {
    console.error("ビルド中にエラーが発生しました:", error);
    process.exit(1);
  }
}

buildBlog();

