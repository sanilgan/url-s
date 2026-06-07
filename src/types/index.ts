// veri şablonlarını tanımladığı TypeScript türleri dosyasıdır.
// Bu dosya kodun daha güvenli ve hatasız olmasını sağlar.
//TypeScript'e "bu veriler nasıl görünmeli" diye tarif eder.
// Böylece yanlış veri tiplerini kullanmayı engeller.

export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  is_active: boolean;
}

export interface Url {
  id: number;
  user_id?: number;
  original_url: string;
  short_code: string;
  title?: string; //opsiyonel
  domain?: string; //opsiyonel
  created_at: Date;
  expires_at?: Date;
  clicks?: number;
  url_count?: number;
  last_clicked_at?: Date;
  is_active: boolean;
}

export interface CreateUrlRequest {
  original_url: string;
  custom_code?: string;
  expires_at?: string;
  title?: string;
  domain?: string;
}

export interface UrlStats {
  url: Url;
  total_clicks: number;
  last_clicked?: Date;
}
