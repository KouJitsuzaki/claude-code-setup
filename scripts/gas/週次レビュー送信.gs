/**
 * 週次レビュー送信（Claude Code セットアップ）
 *
 * ドライブの「AI効果レポート」フォルダにある週次レビューのうち、まだ送っていないものをメールで送る。
 * 使い方：
 *   1. 下の TO と NAME を入れる（宛先は LINE で受け取ったアドレス。このリポジトリには書かない）
 *   2. script.google.com で新しいプロジェクトを作り、このコードを貼って保存
 *   3. testSend を1回実行し、Google の「許可」を押す → 【テスト】のメールが届くか確かめる
 *   4. setupTrigger を1回実行する（毎日9時に sendNewReports が動くようになる）
 */
const TO = '';            // 宛先（LINEで受け取ったアドレスを入れる）
const NAME = '';          // 本人の名字（件名に入る）
const FOLDER_NAME = 'AI効果レポート';

function getFolder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function readText_(file) {
  if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
    return DocumentApp.openById(file.getId()).getBody().getText();
  }
  return file.getBlob().getDataAsString('UTF-8');
}

function send_(file, prefix) {
  const m = file.getName().match(/^(\d{8})/);
  const date = m ? m[1].replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '';
  const subject = `${prefix}【AI効果】${NAME} 週次レビュー ${date}`;
  const body = readText_(file) + '\n\n---\nドライブのファイル：' + file.getUrl();
  MailApp.sendEmail(TO, subject, body);
}

function sendNewReports() {
  if (!TO || !NAME) throw new Error('TO と NAME を入れてください');
  const props = PropertiesService.getScriptProperties();
  const sent = JSON.parse(props.getProperty('sent') || '[]');
  const files = getFolder_().getFiles();
  let latest = 0;
  while (files.hasNext()) {
    const f = files.next();
    if (!/週次レビュー/.test(f.getName())) continue;
    latest = Math.max(latest, f.getDateCreated().getTime());
    if (sent.indexOf(f.getId()) >= 0) continue;
    send_(f, '');
    sent.push(f.getId());
  }
  props.setProperty('sent', JSON.stringify(sent));

  // 土曜の回：直近7日に週次レビューが無ければ知らせる
  const now = new Date();
  if (now.getDay() === 6 && now.getTime() - latest > 7 * 24 * 3600 * 1000) {
    const subject = `【AI効果】${NAME} 週次レビュー未作成`;
    const body = '直近7日に週次レビューがありません。Claude に「今週の週次レビューを作って」と頼んでください。';
    MailApp.sendEmail(TO, subject, body);
    MailApp.sendEmail(Session.getActiveUser().getEmail(), subject, body);
  }
}

function testSend() {
  if (!TO || !NAME) throw new Error('TO と NAME を入れてください');
  const folder = getFolder_();
  const files = folder.getFiles();
  if (files.hasNext()) {
    send_(files.next(), '【テスト】');
  } else {
    MailApp.sendEmail(TO, `【テスト】【AI効果】${NAME} 週次レビュー`, 'テスト送信です。「' + FOLDER_NAME + '」フォルダはまだ空です。');
  }
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendNewReports') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendNewReports').timeBased().everyDays(1).atHour(9).create();
}

// エラーは Apps Script の「トリガー」設定で「失敗の通知：すぐに通知」を選ぶと本人にメールで届く
