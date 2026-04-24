import { useState, useEffect } from "react";
import { LoginPage } from "./auth.jsx";
import {
  apiFetch,
  apiFetchRaw,
  clearToken,
  getRememberMe,
  getToken,
  getUser as getStoredUser,
  setToken as setStoredToken,
  setUser as setStoredUser,
} from "./authClient.js";
import { supabase } from "./supabaseClient.js";

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT DATA
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // HSI Bisnis
  { value: "HSI Bisnis 50 Mbps", otc: 150000, bulanan: 439000, satuan: "Titik", isHSI: true, group: "HSI Bisnis" },
  { value: "HSI Bisnis 75 Mbps", otc: 150000, bulanan: 519000, satuan: "Titik", isHSI: true, group: "HSI Bisnis" },
  { value: "HSI Bisnis 100 Mbps", otc: 150000, bulanan: 669000, satuan: "Titik", isHSI: true, group: "HSI Bisnis" },
  { value: "HSI Bisnis 150 Mbps", otc: 150000, bulanan: 819000, satuan: "Titik", isHSI: true, group: "HSI Bisnis" },
  { value: "HSI Bisnis 200 Mbps", otc: 150000, bulanan: 1049000, satuan: "Titik", isHSI: true, group: "HSI Bisnis" },
  { value: "HSI Bisnis 300 Mbps", otc: 150000, bulanan: 1499000, satuan: "Titik", isHSI: true, group: "HSI Bisnis" },
  // HSI Bisnis Add-on
  { value: "HSI + Voice Bisnis 50 Mbps 800 Menit", otc: 150000, bulanan: 479000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Voice Bisnis 75 Mbps 800 Menit", otc: 150000, bulanan: 559000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Voice Bisnis 100 Mbps 800 Menit", otc: 150000, bulanan: 709000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Voice Bisnis 150 Mbps 800 Menit", otc: 150000, bulanan: 859000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Voice Bisnis 200 Mbps 800 Menit", otc: 150000, bulanan: 1089000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Netmonk Bisnis 50 Mbps", otc: 150000, bulanan: 465000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Netmonk Bisnis 75 Mbps", otc: 150000, bulanan: 545000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Netmonk Bisnis 100 Mbps", otc: 150000, bulanan: 695000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Netmonk Bisnis 150 Mbps", otc: 150000, bulanan: 845000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + Netmonk Bisnis 200 Mbps", otc: 150000, bulanan: 1075000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + OCA Bisnis 50 Mbps", otc: 150000, bulanan: 543000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + OCA Bisnis 75 Mbps", otc: 150000, bulanan: 623000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + OCA Bisnis 100 Mbps", otc: 150000, bulanan: 773000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + OCA Bisnis 150 Mbps", otc: 150000, bulanan: 923000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + OCA Bisnis 200 Mbps", otc: 150000, bulanan: 1153000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV Bisnis 50 Mbps", otc: 150000, bulanan: 639000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV Bisnis 75 Mbps", otc: 150000, bulanan: 719000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV Bisnis 100 Mbps", otc: 150000, bulanan: 869000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV Bisnis 150 Mbps", otc: 150000, bulanan: 1019000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV Bisnis 200 Mbps", otc: 150000, bulanan: 1249000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV + Voice Bisnis 50 Mbps 300 Menit", otc: 150000, bulanan: 664000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV + Voice Bisnis 75 Mbps 300 Menit", otc: 150000, bulanan: 744000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV + Voice Bisnis 100 Mbps 300 Menit", otc: 150000, bulanan: 894000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV + Voice Bisnis 150 Mbps 300 Menit", otc: 150000, bulanan: 1044000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV + Voice Bisnis 200 Mbps 300 Menit", otc: 150000, bulanan: 1274000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  { value: "HSI + IPTV + Voice Bisnis 300 Mbps 300 Menit", otc: 150000, bulanan: 1724000, satuan: "Titik", isHSI: true, group: "HSI Bisnis Add-on" },
  // HSI Basic
  { value: "HSI Basic 50 Mbps", otc: 150000, bulanan: 387000, satuan: "Titik", isHSI: true, group: "HSI Basic" },
  { value: "HSI Basic 75 Mbps", otc: 150000, bulanan: 447000, satuan: "Titik", isHSI: true, group: "HSI Basic" },
  { value: "HSI Basic 100 Mbps", otc: 150000, bulanan: 557000, satuan: "Titik", isHSI: true, group: "HSI Basic" },
  { value: "HSI Basic 150 Mbps", otc: 150000, bulanan: 697000, satuan: "Titik", isHSI: true, group: "HSI Basic" },
  { value: "HSI Basic 200 Mbps", otc: 150000, bulanan: 887000, satuan: "Titik", isHSI: true, group: "HSI Basic" },
  { value: "HSI Basic 300 Mbps", otc: 150000, bulanan: 1257000, satuan: "Titik", isHSI: true, group: "HSI Basic" },
  // HSI Basic Add-on
  { value: "HSI + Voice Basic 50 Mbps 800 Menit", otc: 150000, bulanan: 427000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Voice Basic 75 Mbps 800 Menit", otc: 150000, bulanan: 487000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Voice Basic 100 Mbps 800 Menit", otc: 150000, bulanan: 597000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Voice Basic 150 Mbps 800 Menit", otc: 150000, bulanan: 737000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Voice Basic 200 Mbps 800 Menit", otc: 150000, bulanan: 917000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Netmonk Basic 50 Mbps", otc: 150000, bulanan: 413000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Netmonk Basic 75 Mbps", otc: 150000, bulanan: 473000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Netmonk Basic 100 Mbps", otc: 150000, bulanan: 583000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Netmonk Basic 150 Mbps", otc: 150000, bulanan: 723000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + Netmonk Basic 200 Mbps", otc: 150000, bulanan: 903000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + OCA Basic 50 Mbps", otc: 150000, bulanan: 491000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + OCA Basic 75 Mbps", otc: 150000, bulanan: 551000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + OCA Basic 100 Mbps", otc: 150000, bulanan: 661000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + OCA Basic 150 Mbps", otc: 150000, bulanan: 801000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + OCA Basic 200 Mbps", otc: 150000, bulanan: 981000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV Basic 50 Mbps", otc: 150000, bulanan: 587000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV Basic 75 Mbps", otc: 150000, bulanan: 647000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV Basic 100 Mbps", otc: 150000, bulanan: 757000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV Basic 150 Mbps", otc: 150000, bulanan: 897000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV Basic 200 Mbps", otc: 150000, bulanan: 1077000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV + Voice Basic 50 Mbps 300 Menit", otc: 150000, bulanan: 612000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV + Voice Basic 75 Mbps 300 Menit", otc: 150000, bulanan: 672000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV + Voice Basic 100 Mbps 300 Menit", otc: 150000, bulanan: 782000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV + Voice Basic 150 Mbps 300 Menit", otc: 150000, bulanan: 922000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV + Voice Basic 200 Mbps 300 Menit", otc: 150000, bulanan: 1102000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  { value: "HSI + IPTV + Voice Basic 300 Mbps 300 Menit", otc: 150000, bulanan: 1482000, satuan: "Titik", isHSI: true, group: "HSI Basic Add-on" },
  // Pijar Sekolah
  { value: "HSI + Pijar Sekolah Standalone", otc: 0, bulanan: 1000000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Bisnis 50 Mbps", otc: 150000, bulanan: 1022000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Bisnis 75 Mbps", otc: 150000, bulanan: 1102000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Bisnis 100 Mbps", otc: 150000, bulanan: 1252000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Bisnis 150 Mbps", otc: 150000, bulanan: 1402000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Bisnis 200 Mbps", otc: 150000, bulanan: 1632000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Basic 50 Mbps", otc: 150000, bulanan: 970000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Basic 75 Mbps", otc: 150000, bulanan: 1030000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Basic 100 Mbps", otc: 150000, bulanan: 1140000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Basic 150 Mbps", otc: 150000, bulanan: 1280000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  { value: "HSI + Pijar Sekolah Basic 200 Mbps", otc: 150000, bulanan: 1460000, satuan: "Titik", isHSI: true, group: "Pijar Sekolah" },
  // Astinet Reguler JaBoDeTaBek
  { value: "Astinet Reguler JaBoDeTaBek 1 Mbps", otc: 2500000, bulanan: 125000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 2 Mbps", otc: 2500000, bulanan: 243000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 5 Mbps", otc: 2500000, bulanan: 548000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 10 Mbps", otc: 2500000, bulanan: 904000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 20 Mbps", otc: 2500000, bulanan: 1752000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 50 Mbps", otc: 2500000, bulanan: 3409000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 100 Mbps", otc: 2500000, bulanan: 5531000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 200 Mbps", otc: 2500000, bulanan: 10728000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 500 Mbps", otc: 2500000, bulanan: 23982000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  { value: "Astinet Reguler JaBoDeTaBek 1000 Mbps", otc: 2500000, bulanan: 35715000, satuan: "Titik", isHSI: false, group: "Astinet JaBoDeTaBek" },
  // Astinet Reguler Jawa
  { value: "Astinet Reguler Jawa 1 Mbps", otc: 2500000, bulanan: 143000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  { value: "Astinet Reguler Jawa 2 Mbps", otc: 2500000, bulanan: 273000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  { value: "Astinet Reguler Jawa 5 Mbps", otc: 2500000, bulanan: 615000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  { value: "Astinet Reguler Jawa 10 Mbps", otc: 2500000, bulanan: 1013000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  { value: "Astinet Reguler Jawa 20 Mbps", otc: 2500000, bulanan: 1963000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  { value: "Astinet Reguler Jawa 50 Mbps", otc: 2500000, bulanan: 3820000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  { value: "Astinet Reguler Jawa 100 Mbps", otc: 2500000, bulanan: 6195000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  { value: "Astinet Reguler Jawa 200 Mbps", otc: 2500000, bulanan: 12017000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  { value: "Astinet Reguler Jawa 500 Mbps", otc: 2500000, bulanan: 26860000, satuan: "Titik", isHSI: false, group: "Astinet Jawa" },
  // Astinet Reguler Sumatera
  { value: "Astinet Reguler Sumatera 1 Mbps", otc: 2500000, bulanan: 152000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  { value: "Astinet Reguler Sumatera 2 Mbps", otc: 2500000, bulanan: 291000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  { value: "Astinet Reguler Sumatera 5 Mbps", otc: 2500000, bulanan: 658000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  { value: "Astinet Reguler Sumatera 10 Mbps", otc: 2500000, bulanan: 1085000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  { value: "Astinet Reguler Sumatera 20 Mbps", otc: 2500000, bulanan: 2104000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  { value: "Astinet Reguler Sumatera 50 Mbps", otc: 2500000, bulanan: 4092000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  { value: "Astinet Reguler Sumatera 100 Mbps", otc: 2500000, bulanan: 6638000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  { value: "Astinet Reguler Sumatera 200 Mbps", otc: 2500000, bulanan: 12875000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  { value: "Astinet Reguler Sumatera 500 Mbps", otc: 2500000, bulanan: 28779000, satuan: "Titik", isHSI: false, group: "Astinet Sumatera" },
  // Astinet Reguler Kalimantan & KTI
  { value: "Astinet Reguler Kalimantan & KTI 1 Mbps", otc: 2500000, bulanan: 165000, satuan: "Titik", isHSI: false, group: "Astinet Kalimantan & KTI" },
  { value: "Astinet Reguler Kalimantan & KTI 2 Mbps", otc: 2500000, bulanan: 316000, satuan: "Titik", isHSI: false, group: "Astinet Kalimantan & KTI" },
  { value: "Astinet Reguler Kalimantan & KTI 5 Mbps", otc: 2500000, bulanan: 714000, satuan: "Titik", isHSI: false, group: "Astinet Kalimantan & KTI" },
  { value: "Astinet Reguler Kalimantan & KTI 10 Mbps", otc: 2500000, bulanan: 1176000, satuan: "Titik", isHSI: false, group: "Astinet Kalimantan & KTI" },
  { value: "Astinet Reguler Kalimantan & KTI 20 Mbps", otc: 2500000, bulanan: 2278000, satuan: "Titik", isHSI: false, group: "Astinet Kalimantan & KTI" },
  { value: "Astinet Reguler Kalimantan & KTI 50 Mbps", otc: 2500000, bulanan: 4434000, satuan: "Titik", isHSI: false, group: "Astinet Kalimantan & KTI" },
  { value: "Astinet Reguler Kalimantan & KTI 100 Mbps", otc: 2500000, bulanan: 7190000, satuan: "Titik", isHSI: false, group: "Astinet Kalimantan & KTI" },
  { value: "Astinet Reguler Kalimantan & KTI 500 Mbps", otc: 2500000, bulanan: 31177000, satuan: "Titik", isHSI: false, group: "Astinet Kalimantan & KTI" },
  // Astinet Beda BW JaBoDeTaBek
  { value: "Astinet Beda BW JaBoDeTaBek Global 1 Mbps", otc: 2500000, bulanan: 151000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 2 Mbps", otc: 2500000, bulanan: 292000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 5 Mbps", otc: 2500000, bulanan: 665000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 10 Mbps", otc: 2500000, bulanan: 1071000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 20 Mbps", otc: 2500000, bulanan: 1845000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 50 Mbps", otc: 2500000, bulanan: 4165000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 100 Mbps", otc: 2500000, bulanan: 7114000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 200 Mbps", otc: 2500000, bulanan: 12213000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 500 Mbps", otc: 2500000, bulanan: 28908000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Global 1000 Mbps", otc: 2500000, bulanan: 40770000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 1 Mbps", otc: 2500000, bulanan: 39000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 2 Mbps", otc: 2500000, bulanan: 74000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 5 Mbps", otc: 2500000, bulanan: 175000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 10 Mbps", otc: 2500000, bulanan: 301000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 20 Mbps", otc: 2500000, bulanan: 553000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 50 Mbps", otc: 2500000, bulanan: 1171000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 100 Mbps", otc: 2500000, bulanan: 2137000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 200 Mbps", otc: 2500000, bulanan: 3711000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 500 Mbps", otc: 2500000, bulanan: 7917000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  { value: "Astinet Beda BW JaBoDeTaBek Domestik 1000 Mbps", otc: 2500000, bulanan: 12545000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW JaBoDeTaBek" },
  // Astinet Beda BW Jawa
  { value: "Astinet Beda BW Jawa Global 1 Mbps", otc: 2500000, bulanan: 174000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Global 5 Mbps", otc: 2500000, bulanan: 766000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Global 10 Mbps", otc: 2500000, bulanan: 1233000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Global 20 Mbps", otc: 2500000, bulanan: 2125000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Global 50 Mbps", otc: 2500000, bulanan: 4791000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Global 100 Mbps", otc: 2500000, bulanan: 8183000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Global 200 Mbps", otc: 2500000, bulanan: 15195000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Global 500 Mbps", otc: 2500000, bulanan: 33245000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Domestik 1 Mbps", otc: 2500000, bulanan: 44000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Domestik 5 Mbps", otc: 2500000, bulanan: 198000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Domestik 10 Mbps", otc: 2500000, bulanan: 339000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Domestik 20 Mbps", otc: 2500000, bulanan: 621000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Domestik 50 Mbps", otc: 2500000, bulanan: 1312000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Domestik 100 Mbps", otc: 2500000, bulanan: 2395000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Domestik 200 Mbps", otc: 2500000, bulanan: 4157000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  { value: "Astinet Beda BW Jawa Domestik 500 Mbps", otc: 2500000, bulanan: 8869000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Jawa" },
  // Astinet Beda BW Sumatera
  { value: "Astinet Beda BW Sumatera Global 1 Mbps", otc: 2500000, bulanan: 186000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Global 5 Mbps", otc: 2500000, bulanan: 822000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Global 10 Mbps", otc: 2500000, bulanan: 1321000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Global 20 Mbps", otc: 2500000, bulanan: 2275000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Global 50 Mbps", otc: 2500000, bulanan: 5132000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Global 100 Mbps", otc: 2500000, bulanan: 8767000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Global 200 Mbps", otc: 2500000, bulanan: 16281000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Global 500 Mbps", otc: 2500000, bulanan: 35619000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Domestik 1 Mbps", otc: 2500000, bulanan: 48000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Domestik 5 Mbps", otc: 2500000, bulanan: 211000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Domestik 10 Mbps", otc: 2500000, bulanan: 362000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Domestik 20 Mbps", otc: 2500000, bulanan: 664000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Domestik 50 Mbps", otc: 2500000, bulanan: 1406000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Domestik 100 Mbps", otc: 2500000, bulanan: 2565000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Domestik 200 Mbps", otc: 2500000, bulanan: 4454000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  { value: "Astinet Beda BW Sumatera Domestik 500 Mbps", otc: 2500000, bulanan: 9501000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Sumatera" },
  // Astinet Beda BW Kalimantan & KTI
  { value: "Astinet Beda BW Kalimantan & KTI Global 1 Mbps", otc: 2500000, bulanan: 225000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Global 5 Mbps", otc: 2500000, bulanan: 990000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Global 10 Mbps", otc: 2500000, bulanan: 1665000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Global 20 Mbps", otc: 2500000, bulanan: 3236000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Global 50 Mbps", otc: 2500000, bulanan: 7306000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Global 100 Mbps", otc: 2500000, bulanan: 12480000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Global 200 Mbps", otc: 2500000, bulanan: 23181000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Global 500 Mbps", otc: 2500000, bulanan: 44954000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Domestik 1 Mbps", otc: 2500000, bulanan: 86000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Domestik 5 Mbps", otc: 2500000, bulanan: 385000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Domestik 10 Mbps", otc: 2500000, bulanan: 663000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Domestik 20 Mbps", otc: 2500000, bulanan: 1216000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Domestik 50 Mbps", otc: 2500000, bulanan: 2576000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Domestik 100 Mbps", otc: 2500000, bulanan: 4702000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Domestik 200 Mbps", otc: 2500000, bulanan: 8165000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  { value: "Astinet Beda BW Kalimantan & KTI Domestik 500 Mbps", otc: 2500000, bulanan: 17418000, satuan: "Titik", isHSI: false, group: "Astinet Beda BW Kalimantan & KTI" },
  // Astinet Fit
  { value: "Astinet Fit JaBoDeTaBek 1 Mbps", otc: 2500000, bulanan: 97000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit JaBoDeTaBek 5 Mbps", otc: 2500000, bulanan: 416000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit JaBoDeTaBek 10 Mbps", otc: 2500000, bulanan: 560000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit JaBoDeTaBek 20 Mbps", otc: 2500000, bulanan: 1085000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit JaBoDeTaBek 50 Mbps", otc: 2500000, bulanan: 2410000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit JaBoDeTaBek 100 Mbps", otc: 2500000, bulanan: 3630000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Jawa 1 Mbps", otc: 2500000, bulanan: 111000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Jawa 5 Mbps", otc: 2500000, bulanan: 473000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Jawa 10 Mbps", otc: 2500000, bulanan: 637000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Jawa 20 Mbps", otc: 2500000, bulanan: 1234000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Jawa 50 Mbps", otc: 2500000, bulanan: 2740000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Jawa 100 Mbps", otc: 2500000, bulanan: 4126000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Sumatera 1 Mbps", otc: 2500000, bulanan: 118000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Sumatera 5 Mbps", otc: 2500000, bulanan: 506000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Sumatera 10 Mbps", otc: 2500000, bulanan: 681000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Sumatera 20 Mbps", otc: 2500000, bulanan: 1318000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Sumatera 50 Mbps", otc: 2500000, bulanan: 2928000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Sumatera 100 Mbps", otc: 2500000, bulanan: 4410000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Kalimantan & KTI 1 Mbps", otc: 2500000, bulanan: 128000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Kalimantan & KTI 5 Mbps", otc: 2500000, bulanan: 546000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Kalimantan & KTI 10 Mbps", otc: 2500000, bulanan: 735000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Kalimantan & KTI 20 Mbps", otc: 2500000, bulanan: 1424000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Kalimantan & KTI 50 Mbps", otc: 2500000, bulanan: 3163000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  { value: "Astinet Fit Kalimantan & KTI 100 Mbps", otc: 2500000, bulanan: 4764000, satuan: "Titik", isHSI: false, group: "Astinet Fit" },
  // Astinet Lite (semua region)
  { value: "Astinet Lite JaBoDeTaBek 1 Mbps", otc: 2500000, bulanan: 81000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite JaBoDeTaBek 5 Mbps", otc: 2500000, bulanan: 349000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite JaBoDeTaBek 10 Mbps", otc: 2500000, bulanan: 470000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite JaBoDeTaBek 20 Mbps", otc: 2500000, bulanan: 910000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite JaBoDeTaBek 50 Mbps", otc: 2500000, bulanan: 2020000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite JaBoDeTaBek 60 Mbps", otc: 2500000, bulanan: 2324000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite JaBoDeTaBek 100 Mbps", otc: 2500000, bulanan: 3215000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Jawa 1 Mbps", otc: 2500000, bulanan: 93000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Jawa 5 Mbps", otc: 2500000, bulanan: 397000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Jawa 10 Mbps", otc: 2500000, bulanan: 535000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Jawa 20 Mbps", otc: 2500000, bulanan: 1035000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Jawa 50 Mbps", otc: 2500000, bulanan: 2296000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Jawa 100 Mbps", otc: 2500000, bulanan: 3655000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Sumatera 1 Mbps", otc: 2500000, bulanan: 99000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Sumatera 5 Mbps", otc: 2500000, bulanan: 424000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Sumatera 10 Mbps", otc: 2500000, bulanan: 571000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Sumatera 20 Mbps", otc: 2500000, bulanan: 1106000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Sumatera 50 Mbps", otc: 2500000, bulanan: 2454000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Sumatera 100 Mbps", otc: 2500000, bulanan: 3906000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Kalimantan & KTI 1 Mbps", otc: 2500000, bulanan: 107000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Kalimantan & KTI 5 Mbps", otc: 2500000, bulanan: 458000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Kalimantan & KTI 10 Mbps", otc: 2500000, bulanan: 617000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Kalimantan & KTI 20 Mbps", otc: 2500000, bulanan: 1195000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Kalimantan & KTI 50 Mbps", otc: 2500000, bulanan: 2651000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  { value: "Astinet Lite Kalimantan & KTI 100 Mbps", otc: 2500000, bulanan: 4219000, satuan: "Titik", isHSI: false, group: "Astinet Lite" },
  // Komponen Astinet
  { value: "Last Mile Astinet", otc: 0, bulanan: 750000, satuan: "SSL", isHSI: false, group: "Komponen Astinet" },
  { value: "PSB Astinet", otc: 2500000, bulanan: 0, satuan: "SSL", isHSI: false, group: "Komponen Astinet" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? "-" : new Intl.NumberFormat("id-ID").format(Math.round(n)));
const fmtPct = (n) => (n == null ? "-" : `${(n * 100).toFixed(1)}%`);
const HISTORY_KEY = "aki_history";
const ROLE_KEY = "aki_role";

const safeJson = (value, fallback) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const readStorage = (key, fallback) => safeJson(localStorage.getItem(key), fallback);
const writeStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));

function calcPreview(products, kontrakBulan) {
  const WACC = 0.1135;
  let rev = 0, cogs = 0;
  products.forEach(({ product, qty }) => {
    if (!product) return;
    rev += product.bulanan * qty * kontrakBulan + product.otc * qty;
    cogs += product.isHSI ? 0 : product.bulanan * qty * kontrakBulan * 0.30 + product.otc * qty * 0.75;
  });
  const gp = rev - cogs;
  const gpm = rev > 0 ? gp / rev : 0;
  const opex = rev * 0.12 * (kontrakBulan / 12);
  const ebit = gp - opex;
  const ni = ebit * (1 - 0.22);
  const nim = rev > 0 ? ni / rev : 0;
  const npv = ni / (1 + WACC) - 0;
  return { rev, cogs, gp, gpm, ni, nim, npv, layak: gpm >= 0.07 && nim >= 0.02 && npv > 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────────────────
// Global styles live in src/index.css (Tailwind + app theme).

// ─────────────────────────────────────────────────────────────────────────────
// SUB COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function LogoStrip({ compact = false, className = "" }) {
  const logoSize = compact ? "h-7 md:h-8" : "h-10 md:h-12";
  return (
    <div className={`inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white px-4 py-2 shadow-[0_18px_45px_rgba(0,0,0,0.22)] ${className}`}>
      <img src="/telkomindonesia.png" alt="Telkom Indonesia" className={`${logoSize} object-contain`} />
      <div className="h-8 w-px bg-slate-200" />
      <img src="/danantara.png" alt="Danantara" className={`${logoSize} object-contain`} />
    </div>
  );
}

function AppBackground({ children }) {
  return (
    <div className="app-shell text-white">{children}</div>
  );
}

function HistoryView({ history, onBack, onUse, onClear }) {
  return (
    <AppBackground>
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-5 md:px-8">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <button onClick={onBack} className="mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65 transition hover:bg-white/10 hover:text-white">
              Kembali
            </button>
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-red-200/70">Riwayat</p>
            <h1 className="syne mt-2 text-4xl font-800">Riwayat Perhitungan AKI</h1>
            <p className="mt-2 text-sm text-white/45">Data tersimpan setelah tombol Hitung AKI dijalankan.</p>
          </div>
          <LogoStrip compact />
        </header>

        {history.length === 0 ? (
          <div className="glass rounded-[2rem] p-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-2xl font-bold">AKI</div>
            <h2 className="syne text-2xl font-800">Belum ada riwayat</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-white/45">Hitung satu proyek dulu, nanti hasilnya otomatis muncul di sini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={onClear} className="rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20">
                Hapus Riwayat
              </button>
            </div>
            {history.map(item => (
              <article key={item.id} className="glass rounded-3xl p-5 md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.result?.layak ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
                        {item.result?.layak ? "LAYAK" : "TIDAK LAYAK"}
                      </span>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/55">{item.role === "solution" ? "Solution" : "Striker"}</span>
                      <span className="text-xs text-white/35">{new Date(item.createdAt).toLocaleString("id-ID")}</span>
                    </div>
                    <h2 className="syne truncate text-2xl font-800">{item.form?.nama_program || "Tanpa nama program"}</h2>
                    <p className="mt-1 text-sm text-white/48">{item.form?.nama_customer || "Customer belum diisi"} - {item.form?.lokasi || "Lokasi belum diisi"}</p>
                  </div>
                  <button onClick={() => onUse(item)}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-red-950 transition hover:bg-red-100">
                    Buka Lagi
                  </button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {[
                    ["Revenue", `Rp ${fmt(item.result?.total_revenue)}`],
                    ["GPM", fmtPct(item.result?.gpm)],
                    ["NIM", fmtPct(item.result?.nim)],
                    ["Produk", `${item.products?.filter(p => p.product).length || 0} item`],
                  ].map(([label, value]) => (
                    <div key={label} className="glass-sm rounded-2xl p-4">
                      <div className="text-xs uppercase tracking-widest text-white/35">{label}</div>
                      <div className="mt-1 font-bold text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppBackground>
  );
}

function Label({ children }) {
  return <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">{children}</div>;
}

function ProductSearch({ row, index, onChange, onRemove }) {
  const [q, setQ] = useState(row.product?.value || "");
  const [open, setOpen] = useState(false);
  const filtered = q.length > 1 ? PRODUCTS.filter(p => p.value.toLowerCase().includes(q.toLowerCase())) : [];
  const groups = [...new Set(filtered.map(p => p.group))];

  return (
    <div className="glass-sm rounded-xl p-3 hover:border-red-500/20 transition-colors">
      <div className="grid grid-cols-1 gap-2 items-start md:grid-cols-12">
        <div className="relative md:col-span-5">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input className="gi w-full pl-9 pr-3 py-2.5 text-sm rounded-lg"
            placeholder="Cari produk..." value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); onChange(index, "product", null); }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
          {open && q.length > 1 && (
            <div className="absolute z-50 top-full left-0 right-0 rounded-xl shadow-2xl max-h-60 overflow-y-auto mt-1"
              style={{ background: "#1a1030", border: "1px solid rgba(255,255,255,0.12)" }}>
              {filtered.length === 0 && <div className="px-4 py-3 text-sm text-white/30 italic">Tidak ditemukan</div>}
              {groups.map(g => (
                <div key={g}>
                  <div className="px-3 py-1.5 text-xs font-bold text-red-400/70 uppercase tracking-wider"
                    style={{ background: "rgba(0,0,0,0.3)" }}>{g}</div>
                  {filtered.filter(p => p.group === g).map(p => (
                    <button key={p.value} className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-red-900/30 hover:text-white flex justify-between transition-colors"
                      onMouseDown={() => { onChange(index, "product", p); setQ(p.value); setOpen(false); }}>
                      <span>{p.value}</span>
                      <span className="text-xs text-white/30 ml-2 shrink-0">{p.satuan}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <input type="number" min="1"
            className="gi w-full px-3 py-2.5 text-sm text-center rounded-lg"
            value={row.qty} onChange={e => onChange(index, "qty", parseInt(e.target.value) || 1)} />
        </div>
        <div className="md:col-span-2">
          <select className="gi w-full px-2 py-2.5 text-xs rounded-lg"
            value={row.tipe} onChange={e => onChange(index, "tipe", e.target.value)}>
            <option value="Butuh JT">Butuh JT</option>
            <option value="Tanpa JT">Tanpa JT</option>
            <option value="Existing">Existing</option>
          </select>
        </div>
        <div className="flex flex-col items-start justify-center gap-1 pt-1 md:col-span-2 md:items-end">
          {row.product ? (
            <>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.product.isHSI ? "bg-orange-500/20 text-orange-300" : "bg-red-500/20 text-red-300"}`}>
                {row.product.isHSI ? "HSI" : "Non-HSI"}
              </span>
              <span className="text-xs text-white/40">Rp {fmt(row.product.bulanan)}/bln</span>
            </>
          ) : <span className="text-xs text-white/20 italic">—</span>}
        </div>
        <div className="flex justify-end pt-1 md:col-span-1">
          <button onClick={() => onRemove(index)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 text-lg font-bold transition-all">×</button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, ok, threshold }) {
  const border = ok === true ? "border-emerald-500/30" : ok === false ? "border-red-500/30" : "border-white/10";
  const bg = ok === true ? "bg-emerald-500/10" : ok === false ? "bg-red-500/10" : "bg-white/5";
  const valColor = ok === true ? "text-emerald-400" : ok === false ? "text-red-400" : "text-white";
  return (
    <div className={`rounded-xl p-4 border ${border} ${bg}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-white/40 font-medium">{label}</span>
          <div className="flex items-center gap-6">
          {threshold && <span className={`text-xs font-semibold ${ok ? "text-emerald-400/70" : "text-red-400/70"}`}>{threshold}</span>}
          {ok === true && <span className="text-emerald-400 text-xs">✓</span>}
        </div>
      </div>
      <div className={`font-bold text-base ${valColor}`}>{value}</div>
    </div>
  );
}

function YearlyChart({ data, label, color = "#ef4444" }) {
  if (!data || !data.some(Boolean)) return null;
  const max = Math.max(...data.map(Math.abs));
  const years = ["Thn 1", "Thn 2", "Thn 3", "Thn 4", "Thn 5"];
  return (
    <div>
      <div className="text-xs text-white/40 font-semibold mb-3 uppercase tracking-wider">{label}</div>
      <div className="flex items-end gap-1.5 h-16">
        {data.map((v, i) => {
          const h = max > 0 ? Math.abs(v) / max * 100 : 0;
          const isNeg = v < 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div style={{ height: `${h}%`, backgroundColor: isNeg ? "#f87171" : color, minHeight: v !== 0 ? 3 : 0, opacity: 0.85 }}
                className="w-full rounded-t transition-all duration-700" />
              <span className="text-xs text-white/30">{years[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecoCard({ reco }) {
  const icons = { upgrade_bandwidth: "📶", extend_contract: "📅", adjust_margin: "💰", add_product: "➕", reduce_capex: "🔧" };
  const border = { high: "border-red-500/30", medium: "border-orange-500/30", low: "border-white/10" };
  const badge = { high: "bg-red-500/20 text-red-300", medium: "bg-orange-500/20 text-orange-300", low: "bg-white/10 text-white/50" };
  const label = { high: "Prioritas Tinggi", medium: "Prioritas Sedang", low: "Prioritas Rendah" };
  return (
    <div className={`rounded-xl p-4 border ${border[reco.priority]} bg-white/4`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icons[reco.type] || "💡"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-semibold text-white text-sm">{reco.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge[reco.priority]}`}>{label[reco.priority]}</span>
          </div>
          <p className="text-sm text-white/60 mb-2 leading-relaxed">{reco.detail}</p>
          {reco.estimated_impact && (
            <div className="text-xs text-white/40 bg-white/5 rounded-lg px-3 py-2 mb-2">
              📊 <strong className="text-white/60">Estimasi dampak:</strong> {reco.estimated_impact}
            </div>
          )}
          {reco.action && (
            <div className="text-xs font-semibold text-red-300/80">▶ {reco.action}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function AKIApp() {
  const [user, setUser] = useState(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    return token && storedUser ? storedUser : null;
  });
  const [showExitModal, setShowExitModal] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [history, setHistory] = useState(() => readStorage(HISTORY_KEY, []));
  const [role, setRole] = useState(() => readStorage(ROLE_KEY, null));
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);

  const [form, setForm] = useState({
    nama_program: "", nama_customer: "", cust_group: "", lokasi: "",
    teknologi: "FO", rencana_selesai: new Date().getFullYear(),
    jumlah_lop: 1, id_lop: "", kontrak_tahun: 1, kontrak_bulan: 0,
    start_month: 1, om_pct: 0.12,
  });
  const [products, setProducts] = useState([{ product: null, qty: 1, tipe: "Butuh JT" }]);
  const [capex, setCapex] = useState({ material: "", jasa: "", lifetime_years: 5 });

  const [result, setResult] = useState(null);
  const [recos, setRecos] = useState(null);
  const [recoLoading, setRecoLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  const kontrakBulan = form.kontrak_tahun * 12 + form.kontrak_bulan;

  useEffect(() => {
    apiFetchRaw("/health").then(r => r.ok && setApiAvailable(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const syncFromSession = async (session) => {
      if (!session?.access_token) return;
      const remember = getRememberMe();
      setStoredToken(session.access_token, remember);

      const me = await apiFetch("/auth/me").catch(() => null);
      const profile = me?.profile || null;

      const nextUser = {
        id: session.user?.id,
        email: session.user?.email,
        profile: profile || { id: session.user?.id },
      };

      setStoredUser(nextUser, remember);
      setUser(nextUser);
    };

    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      if (session) syncFromSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        syncFromSession(session);
      } else if (event === "SIGNED_OUT") {
        clearToken();
        setUser(null);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleLogin = (nextUser) => {
    setUser(nextUser);
    setRole(readStorage(ROLE_KEY, null));
  };

  const handleLogout = async () => {
    try {
      await supabase?.auth?.signOut?.();
    } catch {
      // ignore
    }
    clearToken();
    localStorage.removeItem(ROLE_KEY);
    setUser(null);
    setPage("dashboard");
    setRole(null);
    setStep(0);
    setResult(null);
    setRecos(null);
  };

  const persistHistory = (nextResult) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      user: user?.profile?.full_name || user?.email || "User AKI",
      role,
      form,
      products,
      capex,
      result: nextResult,
    };
    const nextHistory = [entry, ...history].slice(0, 30);
    setHistory(nextHistory);
    writeStorage(HISTORY_KEY, nextHistory);
  };

  const setRolePersist = (nextRole) => {
    if (!nextRole) {
      localStorage.removeItem(ROLE_KEY);
    } else {
      writeStorage(ROLE_KEY, nextRole);
    }
    setRole(nextRole);
  };

  const handleUseHistory = (item) => {
    setRolePersist(item.role || "striker");
    setForm(item.form || form);
    setProducts(item.products?.length ? item.products : [{ product: null, qty: 1, tipe: "Butuh JT" }]);
    setCapex(item.capex || { material: "", jasa: "", lifetime_years: 5 });
    setResult(item.result || null);
    setRecos(null);
    setStep(item.role === "solution" ? STEPS_SOLUTION.length - 1 : STEPS_STRIKER.length - 1);
    setPage("dashboard");
  };

  const clearHistory = () => {
    setHistory([]);
    writeStorage(HISTORY_KEY, []);
  };

  const updateProduct = (i, key, val) => {
    const next = [...products];
    next[i] = { ...next[i], [key]: val };
    setProducts(next);
  };

  const buildPayload = () => ({
    ...form,
    products: products.filter(p => p.product).map(p => ({
      name: p.product.value, qty: p.qty,
      monthly_price: p.product.bulanan, otc_price: p.product.otc,
      is_hsi: p.product.isHSI, satuan: p.product.satuan, tipe: p.tipe,
    })),
    capex: capex.material || capex.jasa ? {
      material: parseFloat(capex.material) || 0,
      jasa: parseFloat(capex.jasa) || 0,
      lifetime_years: capex.lifetime_years,
    } : null,
  });

  const handleCalculate = async () => {
    setLoading(true); setResult(null); setRecos(null);
    try {
      if (apiAvailable) {
        const data = await apiFetch("/calculate", {
          method: "POST",
          body: JSON.stringify(buildPayload()),
        });
        if (data?.ok) {
          setResult(data.result);
          persistHistory(data.result);
        } else {
          if (data?.error === "Unauthorized") handleLogout();
          alert(data?.error || "Gagal menghitung AKI");
        }
      } else {
        const prev = calcPreview(products, kontrakBulan);
        const previewResult = {
          ...prev, total_revenue: prev.rev, total_cogs: prev.cogs,
          total_gross_profit: prev.gp, total_ni: prev.ni,
          gpm_ok: prev.gpm >= 0.07, nim_ok: prev.nim >= 0.02, npv_ok: prev.npv > 0,
          irr_ok: false, pp_ok: false, npv: prev.npv, mirr: null,
          payback_str: "N/A (perlu CAPEX)", layak: prev.layak,
          gpm: prev.gpm, nim: prev.nim, capex_total: 0,
          rev_by_year: [prev.rev, 0, 0, 0, 0], ni_by_year: [prev.ni, 0, 0, 0, 0],
          fcf_by_year: [prev.ni, 0, 0, 0, 0],
        };
        setResult(previewResult);
        persistHistory(previewResult);
      }
    } finally { setLoading(false); }
  };

  const handleGetRecos = async () => {
    setRecoLoading(true);
    try {
      if (apiAvailable) {
        const data = await apiFetch("/recommend", {
          method: "POST",
          body: JSON.stringify(buildPayload()),
        });
        if (data?.ok && data.recommendations) setRecos(data.recommendations);
        if (data?.error === "Unauthorized") handleLogout();
      }
    } finally { setRecoLoading(false); }
  };

  const handleExportExcel = async () => {
    setExcelLoading(true);
    try {
      const res = await apiFetchRaw("/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err?.error === "Unauthorized") handleLogout();
        alert(`Gagal generate Excel: ${err.error || res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `AKI_${form.nama_customer || "output"}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally { setExcelLoading(false); }
  };

  const hasProducts = products.some(p => p.product);
  const STEPS_STRIKER = ["Info Customer", "Produk", "Hasil AKI"];
  const STEPS_SOLUTION = ["Info Program", "Produk", "CAPEX & Biaya", "Hasil AKI"];
  const steps = role === "striker" ? STEPS_STRIKER : STEPS_SOLUTION;
  const isLastStep = step === steps.length - 1;
  const isDirty = Boolean(role) && (
    step > 0 ||
    Boolean(form.nama_program || form.nama_customer || form.lokasi) ||
    hasProducts ||
    Boolean(capex.material || capex.jasa)
  );

  useEffect(() => {
    if (!user || !isDirty) return;

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [user, isDirty]);

  const exitModalUI = showExitModal && (
    (() => {
      const title = !role ? "Keluar aplikasi?" : (isDirty ? "Keluar dari halaman?" : "Keluar aplikasi?");
      const desc = !role ? "Anda akan keluar dari aplikasi dan harus login kembali." : (isDirty ? "Perubahan yang belum disimpan akan hilang." : "Anda akan keluar dari aplikasi dan harus login kembali.");
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowExitModal(false); }}
        >
          <div className="w-[90%] max-w-md rounded-2xl bg-[#1a1030] border border-white/10 p-6 shadow-2xl animate-scaleIn pointer-events-auto">
            <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
            <p className="text-sm text-white/50 mb-6">{desc}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition"
              >
                Batal
              </button>
              <button
                onClick={() => { setShowExitModal(false); handleLogout(); }}
                className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      );
    })()
  );

  if (!user) return <LoginPage onLogin={handleLogin} />;

  if (page === "history") return (
    <HistoryView
      history={history}
      onBack={() => setPage("dashboard")}
      onUse={handleUseHistory}
      onClear={clearHistory}
    />
  );

  // ── Role Selection ──────────────────────────────────────────────────────────
  if (!role) return (
    <AppBackground>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/55 backdrop-blur-2xl relative">
        <div className="flex w-full items-center gap-4 px-4 py-4 md:px-6">
          

          <div className="min-w-0 flex-1">
            <div className="syne truncate text-xl font-800 leading-none tracking-tight text-white md:text-2xl">
              AKI System
            </div>
            <div className="mt-1 truncate text-xs text-white/35">
              {user?.profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "User"}
            </div>
          </div>

          <button
            onClick={() => setPage("history")}
            className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white md:inline-flex"
          >
            Riwayat ({history.length})
          </button>

          <button
            onClick={() => setShowExitModal(true)}
            className="hidden rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 md:inline-flex"
          >
            Keluar
          </button>

          <div className="ml-auto hidden shrink-0 md:block">
            <LogoStrip />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-200/70">Home</p>
          <h1 className="syne mt-3 text-4xl font-500 leading-tight text-white md:text-5xl">
            Pilih mode perhitungan AKI
          </h1>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          {[
            {
              id: "striker",
              kicker: "Sales / AM",
              title: "Striker",
              accent: "from-red-500 to-rose-500",
              chip: "Pre-check cepat",
              desc: "Cek kelayakan investasi secara cepat tanpa input CAPEX.",
              features: ["Pilih produk & volume", "Estimasi AKI instan", "Cocok untuk pre-check"],
            },
            {
              id: "solution",
              kicker: "Solution Team",
              title: "Solution & Offering",
              accent: "from-amber-400 to-orange-500",
              chip: "Analisis lengkap",
              desc: "Kalkulasi lengkap dengan CAPEX, OPEX, NPV, MIRR, dan Excel.",
              features: ["Input CAPEX dari TIF", "Generate Excel", "AI rekomendasi"],
            },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRolePersist(r.id);
                setStep(0);
                setResult(null);
                setRecos(null);
              }}
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-7 text-left shadow-[0_24px_90px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${r.accent}`} />
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-500/10 blur-3xl transition duration-300 group-hover:bg-red-500/15" />
              <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
                  <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${r.accent}`} />
                  {r.kicker}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <h2 className="syne text-3xl font-800 text-white md:text-4xl">{r.title}</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/55">
                    {r.chip}
                  </span>
                </div>

                <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">{r.desc}</p>

                <div className="mt-7 space-y-3">
                  {r.features.map((f) => (
                    <div key={f} className="flex items-center gap-3 text-sm text-white/60">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] text-red-200">
                        ✓
                      </span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-red-950 transition group-hover:bg-red-100">
                  Mulai Hitung
                  <span className="text-base">→</span>
                </div>
              </div>
            </button>
          ))}
        </section>
      </div>

      {exitModalUI}
    </AppBackground>
  );

// ── Main App ────────────────────────────────────────────────────────────────
  return (
    <AppBackground>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/55 backdrop-blur-2xl">
        <div className="flex w-full items-center px-4 py-4 md:px-6">

          <div className="shrink-0 min-w-[120px]">
            <div className="syne truncate text-lg font-800 leading-none tracking-tight text-white md:text-xl">
              AKI System
            </div>
            <div className="mt-1 truncate text-xs text-red-200/60">
              {role === "striker" ? "Striker" : "Solution & Offering"} · {user.profile?.full_name || user.email}
            </div>
          </div>

          <div className="flex-1 flex justify-center px-4 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 whitespace-nowrap">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all ${
                      i < step
                        ? "bg-emerald-500/15 text-emerald-300"
                        : i === step
                          ? "bg-red-600 text-white shadow-lg shadow-red-900/40"
                          : "text-white/35"
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                      i <= step ? "border-current" : "border-white/10"
                    }`}>
                      {i < step ? "✓" : i + 1}
                    </span>
                    <span className="uppercase tracking-[0.18em]">{s}</span>
                  </div>
                  {i < steps.length - 1 && <span className="text-white/15">›</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setPage("history")}
              className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white md:inline-flex"
            >
              Riwayat ({history.length})
            </button>
            <button
              onClick={() => setShowExitModal(true)}
              className="hidden rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 md:inline-flex"
            >
              Keluar
            </button>
            <div className="hidden md:block">
              <LogoStrip />
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-8 space-y-5">

        {/* ── STEP 0: Info ──────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="fade glass rounded-2xl p-6">
            <h2 className="syne text-xl font-700 text-white mb-1">
              {role === "solution" ? "Informasi Program" : "Informasi Customer"}
            </h2>
            <p className="text-white/35 text-sm mb-7">Isi data dasar proyek</p>
            <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                <Label>Nama Program / Proyek *</Label>
                <input className="gi w-full px-4 py-3 rounded-xl text-sm"
                  placeholder="cth. Penyediaan Layanan Internet PT XYZ" value={form.nama_program}
                  onChange={e => setForm({ ...form, nama_program: e.target.value })} />
              </div>
              <div>
                <Label>Nama Customer *</Label>
                <input className="gi w-full px-4 py-3 rounded-xl text-sm"
                  placeholder="PT / CV / Instansi" value={form.nama_customer}
                  onChange={e => setForm({ ...form, nama_customer: e.target.value })} />
              </div>
              <div>
                <Label>Customer Group</Label>
                <select className="gi w-full px-4 py-3 rounded-xl text-sm"
                  value={form.cust_group} onChange={e => setForm({ ...form, cust_group: e.target.value })}>
                  <option value="">Pilih...</option>
                  {["Small Enterprise","Medium Enterprise","Large Enterprise","Government","Corporate"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Label>Lokasi / Site *</Label>
                <input className="gi w-full px-4 py-3 rounded-xl text-sm"
                  placeholder="cth. JPK, CAU, Jakarta Selatan" value={form.lokasi}
                  onChange={e => setForm({ ...form, lokasi: e.target.value })} />
              </div>
              <div>
                <Label>Masa Kontrak *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="number" min="0" max="10"
                      className="gi w-full px-4 py-3 rounded-xl text-sm pr-14"
                      value={form.kontrak_tahun} onChange={e => setForm({ ...form, kontrak_tahun: parseInt(e.target.value) || 0 })} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">Tahun</span>
                  </div>
                  <div className="relative flex-1">
                    <input type="number" min="0" max="11"
                      className="gi w-full px-4 py-3 rounded-xl text-sm pr-14"
                      value={form.kontrak_bulan} onChange={e => setForm({ ...form, kontrak_bulan: parseInt(e.target.value) || 0 })} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">Bulan</span>
                  </div>
                </div>
                {kontrakBulan > 0 && (
                  <p className="text-xs text-red-400/80 font-medium mt-1.5">Total: {kontrakBulan} bulan</p>
                )}
              </div>
              {role === "solution" && (
                <>
                  <div>
                    <Label>Teknologi</Label>
                    <select className="gi w-full px-4 py-3 rounded-xl text-sm"
                      value={form.teknologi} onChange={e => setForm({ ...form, teknologi: e.target.value })}>
                      {["FO","Radio","Copper","VSAT"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Rencana Selesai (Tahun)</Label>
                    <input type="number"
                      className="gi w-full px-4 py-3 rounded-xl text-sm"
                      value={form.rencana_selesai} onChange={e => setForm({ ...form, rencana_selesai: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Jumlah LOP</Label>
                    <input type="number" min="1"
                      className="gi w-full px-4 py-3 rounded-xl text-sm"
                      value={form.jumlah_lop} onChange={e => setForm({ ...form, jumlah_lop: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div>
                    <Label>ID LOP</Label>
                    <input className="gi w-full px-4 py-3 rounded-xl text-sm"
                      placeholder="cth. 11270075-PT3-CAU-FC-..." value={form.id_lop}
                      onChange={e => setForm({ ...form, id_lop: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 1: Produk ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="fade space-y-3">
            <div className="glass rounded-2xl p-6 overflow-visible">
              <h2 className="syne text-xl font-700 text-white mb-1">Produk & Layanan</h2>
              <p className="text-white/35 text-sm mb-5">Tambah semua produk dalam proyek ini</p>
              <div className="hidden grid-cols-12 gap-2 mb-2 px-3 md:grid">
                {[["Produk","5"],["Qty","2"],["Tipe","2"],["Info","2"],[" ","1"]].map(([h, c], i) => (
                  <div key={i} className={`col-span-${c} text-xs font-semibold text-white/25 uppercase tracking-wider ${i >= 3 ? "text-center" : ""}`}>{h}</div>
                ))}
              </div>
              <div className="space-y-2">
                {products.map((row, i) => (
                  <ProductSearch key={i} row={row} index={i} onChange={updateProduct}
                    onRemove={i => setProducts(products.filter((_, idx) => idx !== i))} />
                ))}
              </div>
              <button onClick={() => setProducts([...products, { product: null, qty: 1, tipe: "Butuh JT" }])}
                className="mt-3 w-full py-3 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium"
                style={{ border: "2px dashed rgba(255,255,255,0.1)" }}>
                + Tambah Produk
              </button>
            </div>
            <div className="glass-sm rounded-xl px-4 py-3 text-xs text-amber-300/70"
              style={{ borderColor: "rgba(245,158,11,0.2)" }}>
              <strong className="text-amber-300">Catatan COGS:</strong> Produk HSI → COGS = 0. Non-HSI (Astinet dll) → COGS = 30% dari revenue bulanan.
            </div>
          </div>
        )}

        {/* ── STEP 2 (Solution): CAPEX ────────────────────────────────────── */}
        {step === 2 && role === "solution" && (
          <div className="fade glass rounded-2xl p-6">
            <h2 className="syne text-xl font-700 text-white mb-1">CAPEX & Parameter Biaya</h2>
            <p className="text-white/35 text-sm mb-7">Nilai investasi dari TIF dan parameter operasional</p>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label>Material (dari TIF)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-medium">Rp</span>
                  <input type="number" className="gi w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                    placeholder="0" value={capex.material} onChange={e => setCapex({ ...capex, material: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Jasa (dari TIF)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-medium">Rp</span>
                  <input type="number" className="gi w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                    placeholder="0" value={capex.jasa} onChange={e => setCapex({ ...capex, jasa: e.target.value })} />
                </div>
              </div>
              {(capex.material || capex.jasa) && (
                <div className="grid gap-3 glass-sm rounded-xl p-4 text-center md:col-span-2 md:grid-cols-3">
                  {[
                    ["Total CAPEX", (+capex.material || 0) + (+capex.jasa || 0)],
                    ["BOP Lakwas (0.4%)", ((+capex.material || 0) + (+capex.jasa || 0)) * 0.004],
                    ["Total Investasi", ((+capex.material || 0) + (+capex.jasa || 0)) * 1.004],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-xs text-white/35 mb-1">{l}</div>
                      <div className="text-sm font-bold text-white">Rp {fmt(v)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label>Lifetime Aset (Tahun)</Label>
                <select className="gi w-full px-4 py-3 rounded-xl text-sm"
                  value={capex.lifetime_years} onChange={e => setCapex({ ...capex, lifetime_years: +e.target.value })}>
                  {[3, 4, 5, 7, 10].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <Label>O&M % / bulan <span className="text-white/20 font-normal normal-case">(default 12%)</span></Label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" max="1"
                    className="gi w-full px-4 py-3 pr-14 rounded-xl text-sm"
                    value={form.om_pct} onChange={e => setForm({ ...form, om_pct: parseFloat(e.target.value) || 0 })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">× Rev</span>
                </div>
              </div>
              <div>
                <Label>Bulan Mulai Billing</Label>
                <select className="gi w-full px-4 py-3 rounded-xl text-sm"
                  value={form.start_month} onChange={e => setForm({ ...form, start_month: +e.target.value })}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Bulan ke-{i + 1}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── LAST STEP: Hasil AKI ────────────────────────────────────────── */}
        {isLastStep && (
          <div className="fade space-y-4">
            {!result ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="text-6xl mb-5">🧮</div>
                <h2 className="syne text-2xl font-700 text-white mb-2">Siap Menghitung AKI</h2>
                <p className="text-white/40 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                  {role === "striker"
                    ? "Estimasi kelayakan berdasarkan produk & masa kontrak"
                    : "Kalkulasi lengkap: Revenue, COGS, OPEX, CAPEX, NPV, IRR, MIRR, Payback Period"}
                </p>
                <button onClick={handleCalculate} disabled={loading || !hasProducts}
                  className="px-10 py-3.5 bg-red-700 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-900/40 flex items-center gap-2.5 mx-auto text-sm">
                  {loading
                    ? <><span className="spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Menghitung...</>
                    : <>🧮 Hitung AKI</>}
                </button>
              </div>
            ) : (
              <>
                {/* Verdict */}
                <div className={`rounded-2xl p-6 border-2 flex items-center justify-between ${
                  result.layak
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-red-500/40 bg-red-500/10"
                }`}>
                  <div>
                    <div className={`syne text-4xl font-800 ${result.layak ? "text-emerald-400" : "text-red-400"}`}>
                      {result.layak ? "✓ LAYAK" : "✗ TIDAK LAYAK"}
                    </div>
                    <div className={`text-sm mt-1.5 ${result.layak ? "text-emerald-400/70" : "text-red-400/70"}`}>
                      {result.layak
                        ? "Proyek memenuhi semua kriteria kelayakan investasi"
                        : "Proyek belum memenuhi satu atau lebih kriteria kelayakan"}
                    </div>
                  </div>
                  <div className="text-6xl opacity-60">{result.layak ? "📈" : "📉"}</div>
                </div>

                {/* Metrics */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="syne font-700 text-white mb-4">Metrik Kelayakan</h3>
                  <div className="grid gap-3 mb-3 md:grid-cols-2">
                    <MetricCard label="Total Revenue" value={`Rp ${fmt(result.total_revenue)}`} />
                    <MetricCard label="Total COGS" value={`Rp ${fmt(result.total_cogs)}`} />
                    <MetricCard label="Gross Profit" value={`Rp ${fmt(result.total_gross_profit)}`} ok={result.total_gross_profit > 0} />
                    <MetricCard label="GPM" value={fmtPct(result.gpm)} ok={result.gpm_ok} threshold="Min 7%" />
                    <MetricCard label="Net Income" value={`Rp ${fmt(result.total_ni)}`} ok={result.total_ni > 0} />
                    <MetricCard label="NIM" value={fmtPct(result.nim)} ok={result.nim_ok} threshold="Min 2%" />
                  </div>
                  <div className="grid gap-3 pt-3 border-t border-white/8 md:grid-cols-2">
                    <MetricCard label="CAPEX Total" value={result.capex_total > 0 ? `Rp ${fmt(result.capex_total)}` : "—"} />
                    <MetricCard label="NPV (WACC 11.35%)" value={result.npv != null ? `Rp ${fmt(result.npv)}` : "—"} ok={result.npv_ok} threshold="NPV > 0" />
                    <MetricCard label="MIRR" value={result.mirr != null ? fmtPct(result.mirr) : "N/A"} ok={result.irr_ok} threshold="Min 13.35%" />
                    <MetricCard label="Payback Period" value={result.payback_str} ok={result.pp_ok} threshold={`< ${form.kontrak_tahun}T ${form.kontrak_bulan}B`} />
                  </div>
                </div>

                {/* Charts */}
                {result.rev_by_year?.some(Boolean) && (
                  <div className="glass rounded-2xl p-6">
                    <h3 className="syne font-700 text-white mb-5">Proyeksi 5 Tahun</h3>
                    <div className="grid gap-6 md:grid-cols-3">
                      <YearlyChart data={result.rev_by_year} label="Revenue" color="#ef4444" />
                      <YearlyChart data={result.ni_by_year} label="Net Income" color="#f97316" />
                      <YearlyChart data={result.fcf_by_year} label="Free Cash Flow" color="#8b5cf6" />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  <button onClick={handleCalculate} disabled={loading}
                    className="px-4 py-2.5 glass rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
                    🔄 Hitung Ulang
                  </button>
                  {role === "solution" && (
                    <button onClick={handleExportExcel} disabled={excelLoading || !apiAvailable}
                      className="px-5 py-2.5 bg-emerald-700/80 border border-emerald-600/40 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600/80 disabled:opacity-30 transition-all flex items-center gap-2">
                      {excelLoading ? <span className="spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : "📥"}
                      Download Excel
                    </button>
                  )}
                  {!result.layak && (
                    <button onClick={handleGetRecos} disabled={recoLoading || !apiAvailable}
                      className="px-5 py-2.5 bg-amber-600/80 border border-amber-500/40 text-white rounded-xl text-sm font-semibold hover:bg-amber-500/80 disabled:opacity-30 transition-all flex items-center gap-2">
                      {recoLoading ? <span className="spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : "🤖"}
                      AI Rekomendasi
                    </button>
                  )}
                </div>

                {/* AI Recommendations */}
                {recos && (
                  <div className="glass rounded-2xl p-6 fade">
                    <h3 className="syne font-700 text-white mb-3 flex items-center gap-2">
                      🤖 Rekomendasi AI
                    </h3>
                    {recos.summary && (
                      <p className="text-sm text-white/60 mb-4 glass-sm rounded-xl p-3 leading-relaxed">{recos.summary}</p>
                    )}
                    {recos.minimum_contract_months && (
                      <div className="mb-4 glass-sm rounded-xl px-4 py-3 text-sm text-blue-300/80"
                        style={{ borderColor: "rgba(96,165,250,0.2)" }}>
                        📅 <strong className="text-blue-300">Kontrak minimum:</strong> {recos.minimum_contract_months} bulan
                      </div>
                    )}
                    <div className="space-y-3">
                      {recos.recommendations?.map((r, i) => <RecoCard key={i} reco={r} />)}
                    </div>
                  </div>
                )}

                {/* Project summary */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="syne font-700 text-white mb-4">Ringkasan Proyek</h3>
                  <dl className="grid gap-4 text-sm md:grid-cols-2">
                    {[
                      ["Program", form.nama_program || "—"],
                      ["Customer", form.nama_customer || "—"],
                      ["Lokasi", form.lokasi || "—"],
                      ["Masa Kontrak", `${form.kontrak_tahun}T ${form.kontrak_bulan}B (${kontrakBulan} bulan)`],
                      ["Jumlah Produk", `${products.filter(p => p.product).length} produk`],
                      ...(role === "solution" ? [
                        ["CAPEX", capex.material || capex.jasa ? `Rp ${fmt((+capex.material || 0) + (+capex.jasa || 0))}` : "—"],
                        ["O&M %", `${(form.om_pct * 100).toFixed(0)}% / bulan`],
                        ["Teknologi", form.teknologi],
                      ] : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-1">{k}</dt>
                        <dd className="text-white/80 font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between pt-2 pb-8">
          <button onClick={() => step === 0 ? setRolePersist(null) : setStep(s => s - 1)}
            className="px-5 py-2.5 glass rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
            ← {step === 0 ? "Kembali" : "Kembali"}
          </button>
          {!isLastStep && (
            <button onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && (!form.nama_program || !form.nama_customer || !form.lokasi || kontrakBulan === 0)}
              className="px-7 py-2.5 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-900/30">
              Lanjut →
            </button>
          )}
        </div>
      </div>
      {exitModalUI}
    </AppBackground>
  );
}
