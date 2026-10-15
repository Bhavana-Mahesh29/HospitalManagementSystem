import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate } from './auth';

export const notificationsRouter = Router();

// GET notifications for current user
notificationsRouter.get('/', authenticate, (req: Request, res: Response) => {
  const session = (req as any).session;
  const userNotifs = db.notifications.filter((n) => n.userId === session.userId);

  return res.json({
    notifications: userNotifs,
    unreadCount: userNotifs.filter((n) => !n.read).length,
  });
});

// Mark all notifications as read
notificationsRouter.patch('/mark-all-read', authenticate, (req: Request, res: Response) => {
  const session = (req as any).session;
  db.notifications.forEach((n) => {
    if (n.userId === session.userId) {
      n.read = true;
    }
  });

  return res.json({ message: 'All notifications marked as read.' });
});

// Mark single notification as read
notificationsRouter.patch('/:id/read', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const session = (req as any).session;
  const notif = db.notifications.find((n) => n.id === id && n.userId === session.userId);

  if (notif) {
    notif.read = true;
  }

  return res.json({ message: 'Notification marked as read.' });
});
