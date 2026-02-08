import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// 알림 클릭 이벤트 핸들러
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const bedId = notification.data ? notification.data.bedId : null;

  notification.close();

  if (action === 'next-step' && bedId) {
    // '다음 치료' 버튼 클릭 시
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // 열려있는 앱 클라이언트를 찾음
        for (const client of clientList) {
          // 클라이언트에게 메시지 전송 (TreatmentContext에서 수신)
          client.postMessage({
            type: 'NEXT_STEP',
            bedId: bedId
          });
          // 앱이 포커스되어 있지 않다면 포커스 시도 (지원되는 브라우저만)
          if ('focus' in client) {
            return client.focus();
          }
        }
        // 앱이 열려있지 않다면 새로 엶
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  } else {
    // 알림 본문 클릭 시 (앱 열기)
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});