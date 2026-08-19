export type SiteNotificationItem = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  icon_url: string | null;
  image_url: string | null;
  published_at: string;
  read: boolean;
};
