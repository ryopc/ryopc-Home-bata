const fs = require('fs');
const path = require('path');

// 🔒 Cloudflare Pagesの環境変数から注入
const API_KEY = process.env.MICROCMS_API_KEY;
const SERVICE_DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN;

async function buildBlog() {
  const blogDir = path.join(__dirname, 'blog');
  const targetDir = path.join(blogDir, 'articles');

  try {
    // 1. ビルドの裏側でmicroCMSから安全に記事を取得
    const response = await fetch(`https://${SERVICE_DOMAIN}.microcms.io/api/v1/blog`, {
      headers: { "X-MICROCMS-API-KEY": API_KEY }
    });
    const data = await response.json();

    // --------------------------------------------------
    // ⭐ 追加：ブログ一覧ページ（blog/index.html）の生成
    // --------------------------------------------------
    fs.mkdirSync(blogDir, { recursive: true });

    // 記事データの配列から、<li>タグのリストを自動組み立て
    const listItemsHtml = data.contents.map(post => {
      const date = new Date(post.createdAt).toLocaleDateString('ja-JP');
      // URLはドットHTMLなしの綺麗な形（/blog/articles/記事ID）を指定
      return `
    <li>
      <span style="color:#666; margin-right:15px;">${date}</span>
      <a href="/blog/articles/${post.id}" style="color:#0066cc; font-weight:bold; text-decoration:none;">${post.title}</a>
    </li>`;
    }).join('');

    const indexHtmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ブログ記事一覧</title>
  <style>body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; } ul { list-style:none; padding:0; } li { margin-bottom:15px; }</style>
</head>
<body>
  <h1>ブログ記事一覧</h1>
  <p><a href="/">← ホームへ戻る</a></p>
  <hr>
  <ul>
    ${listItemsHtml}
  </ul>
</body>
</html>`;

    // blog/index.html として書き出す
    fs.writeFileSync(path.join(blogDir, 'index.html'), indexHtmlContent);
    console.log("生成完了: /blog/index.html (一覧ページ)");


    // --------------------------------------------------
    // 2. 記事の数だけループして「フォルダ / index.html」を自動生成（元の処理）
    // --------------------------------------------------
    for (const post of data.contents) {
      const postDir = path.join(targetDir, post.id); 
      fs.mkdirSync(postDir, { recursive: true });

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

      fs.writeFileSync(path.join(postDir, 'index.html'), htmlContent);
      console.log(`生成完了: /blog/articles/${post.id}`);
    }

  } catch (error) {
    console.error("ビルド中にエラーが発生しました:", error);
    process.exit(1);
  }
}

buildBlog();
