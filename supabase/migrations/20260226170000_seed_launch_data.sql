insert into locations (state, city, lat, lng)
values
  ('Lagos', 'Lagos Island', 6.454100, 3.394700),
  ('Lagos', 'Ikeja', 6.601800, 3.351500),
  ('Lagos', 'Lekki', 6.469800, 3.585200),
  ('FCT', 'Abuja', 9.076500, 7.398600),
  ('Rivers', 'Port Harcourt', 4.815600, 7.049800),
  ('Kano', 'Kano', 12.002200, 8.592000),
  ('Oyo', 'Ibadan', 7.377500, 3.947000),
  ('Kaduna', 'Kaduna', 10.510500, 7.416500),
  ('Enugu', 'Enugu', 6.458400, 7.546400),
  ('Delta', 'Warri', 5.554900, 5.793200),
  ('Ogun', 'Abeokuta', 7.147500, 3.361900),
  ('Anambra', 'Awka', 6.212000, 7.071500),
  ('Edo', 'Benin City', 6.338200, 5.625700),
  ('Plateau', 'Jos', 9.896500, 8.858300),
  ('Akwa Ibom', 'Uyo', 5.037700, 7.912800)
on conflict (state, city) do update
set
  lat = excluded.lat,
  lng = excluded.lng;

insert into featured_packages (code, name, duration_days, amount_ngn, is_active)
values
  ('feature_7_days', 'Featured - 7 Days', 7, 25000, true),
  ('feature_14_days', 'Featured - 14 Days', 14, 45000, true),
  ('feature_30_days', 'Featured - 30 Days', 30, 80000, true)
on conflict (code) do update
set
  name = excluded.name,
  duration_days = excluded.duration_days,
  amount_ngn = excluded.amount_ngn,
  is_active = excluded.is_active;
