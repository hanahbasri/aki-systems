"""
Generator PDF Ringkasan AKI — Telkom Indonesia
Menggunakan ReportLab Platypus
"""

from io import BytesIO
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# ── Warna brand ──────────────────────────────────────────────────────────────
RED      = colors.HexColor("#CC0000")
RED_LIGHT= colors.HexColor("#FFF0F0")
DARK     = colors.HexColor("#1A1A2E")
GREY_BG  = colors.HexColor("#F5F5F7")
GREY_LINE= colors.HexColor("#E0E0E0")
GREEN    = colors.HexColor("#1B7A3E")
GREEN_BG = colors.HexColor("#E8F5EE")
WHITE    = colors.white
BLACK    = colors.HexColor("#111111")
MUTED    = colors.HexColor("#666666")

W, H = A4
MARGIN = 18 * mm


def fmt(n):
    if n is None:
        return "—"
    try:
        return f"{round(n):,}".replace(",", ".")
    except Exception:
        return str(n)


def fmt_pct(n):
    if n is None:
        return "—"
    return f"{n * 100:.1f}%"


def _styles():
    base = getSampleStyleSheet()
    S = {}

    def add(name, **kw):
        S[name] = ParagraphStyle(name, parent=base["Normal"], **kw)

    add("title",   fontSize=18, fontName="Helvetica-Bold", textColor=WHITE,    leading=22)
    add("subtitle",fontSize=9,  fontName="Helvetica",      textColor=colors.HexColor("#FFCCCC"), leading=12)
    add("section", fontSize=10, fontName="Helvetica-Bold", textColor=RED,      spaceAfter=4,  leading=14)
    add("label",   fontSize=7.5,fontName="Helvetica",      textColor=MUTED,    leading=10)
    add("value",   fontSize=9,  fontName="Helvetica-Bold", textColor=BLACK,    leading=12)
    add("body",    fontSize=8.5,fontName="Helvetica",      textColor=BLACK,    leading=12)
    add("small",   fontSize=7.5,fontName="Helvetica",      textColor=MUTED,    leading=10)
    add("verdict_ok",  fontSize=22, fontName="Helvetica-Bold", textColor=GREEN,  leading=26, alignment=TA_CENTER)
    add("verdict_no",  fontSize=22, fontName="Helvetica-Bold", textColor=RED,    leading=26, alignment=TA_CENTER)
    add("center",  fontSize=8.5,fontName="Helvetica",      textColor=BLACK,    leading=12, alignment=TA_CENTER)
    add("right",   fontSize=8.5,fontName="Helvetica",      textColor=BLACK,    leading=12, alignment=TA_RIGHT)
    add("mono",    fontSize=8.5,fontName="Courier",        textColor=BLACK,    leading=12, alignment=TA_RIGHT)
    add("mono_red",fontSize=8.5,fontName="Courier-Bold",   textColor=RED,      leading=12, alignment=TA_RIGHT)
    add("mono_grn",fontSize=8.5,fontName="Courier-Bold",   textColor=GREEN,    leading=12, alignment=TA_RIGHT)
    return S


def generate_pdf(result: dict, aki_input) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=14 * mm, bottomMargin=14 * mm,
        title="Ringkasan AKI",
    )

    S = _styles()
    story = []
    inp = aki_input
    layak = result.get("layak", False)

    # ── Header banner ─────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("AKI System", S["title"]),
        Paragraph("Analisis Kelayakan Investasi<br/>Telkom Indonesia · Tim Solution &amp; Offering", S["subtitle"]),
        Paragraph(f"Dicetak: {date.today().strftime('%d %b %Y')}", S["subtitle"]),
    ]]
    header_tbl = Table(header_data, colWidths=[60*mm, 90*mm, 40*mm])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,-1), DARK),
        ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING",(0,0), (-1,-1), 8),
        ("TOPPADDING",  (0,0), (-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("ALIGN",       (2,0), (2,0),   "RIGHT"),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 6*mm))

    # ── Verdict card ──────────────────────────────────────────────────────────
    verdict_text = "✓  LAYAK" if layak else "✗  TIDAK LAYAK"
    verdict_style = S["verdict_ok"] if layak else S["verdict_no"]
    verdict_sub = "Proyek memenuhi semua kriteria kelayakan investasi." if layak \
        else "Proyek belum memenuhi satu atau lebih kriteria kelayakan."
    verdict_bg = GREEN_BG if layak else RED_LIGHT
    verdict_border = GREEN if layak else RED

    vd = Table(
        [[Paragraph(verdict_text, verdict_style)],
         [Paragraph(verdict_sub, ParagraphStyle("vs", parent=S["body"], alignment=TA_CENTER, textColor=MUTED))]],
        colWidths=[W - 2*MARGIN],
    )
    vd.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), verdict_bg),
        ("BOX",          (0,0),(-1,-1), 1.5, verdict_border),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("ALIGN",        (0,0),(-1,-1), "CENTER"),
    ]))
    story.append(vd)
    story.append(Spacer(1, 6*mm))

    # ── Info proyek ───────────────────────────────────────────────────────────
    story.append(Paragraph("Informasi Proyek", S["section"]))
    info_rows = [
        [Paragraph("Nama Program", S["label"]), Paragraph(inp.nama_program or "—", S["value"]),
         Paragraph("Customer", S["label"]),     Paragraph(inp.nama_customer or "—", S["value"])],
        [Paragraph("Lokasi", S["label"]),        Paragraph(inp.lokasi or "—", S["value"]),
         Paragraph("Customer Group", S["label"]),Paragraph(inp.cust_group or "—", S["value"])],
        [Paragraph("Teknologi", S["label"]),     Paragraph(inp.teknologi or "—", S["value"]),
         Paragraph("Masa Kontrak", S["label"]),  Paragraph(f"{inp.kontrak_tahun} Tahun  ({inp.kontrak_total_bulan} bulan)", S["value"])],
    ]
    col_w = (W - 2*MARGIN) / 4
    info_tbl = Table(info_rows, colWidths=[col_w*0.7, col_w*1.3, col_w*0.7, col_w*1.3])
    info_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), GREY_BG),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[WHITE, GREY_BG]),
        ("TOPPADDING",   (0,0),(-1,-1), 5),
        ("BOTTOMPADDING",(0,0),(-1,-1), 5),
        ("LEFTPADDING",  (0,0),(-1,-1), 8),
        ("RIGHTPADDING", (0,0),(-1,-1), 4),
        ("GRID",         (0,0),(-1,-1), 0.3, GREY_LINE),
    ]))
    story.append(info_tbl)
    story.append(Spacer(1, 6*mm))

    # ── Tabel produk ──────────────────────────────────────────────────────────
    story.append(Paragraph("Produk &amp; Layanan", S["section"]))
    prod_header = [
        Paragraph("Nama Produk", ParagraphStyle("ph", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold")),
        Paragraph("Qty", ParagraphStyle("ph", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER)),
        Paragraph("Satuan", ParagraphStyle("ph", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER)),
        Paragraph("Tipe", ParagraphStyle("ph", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER)),
        Paragraph("HSI", ParagraphStyle("ph", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER)),
        Paragraph("Harga/bln per unit", ParagraphStyle("ph", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
        Paragraph("Total/bln", ParagraphStyle("ph", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
        Paragraph("OTC", ParagraphStyle("ph", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
    ]
    prod_rows = [prod_header]
    total_monthly = 0
    total_otc = 0
    for prod in inp.products:
        subtotal = prod.monthly_price * prod.qty
        otc_total = prod.otc_price * prod.qty
        total_monthly += subtotal
        total_otc += otc_total
        prod_rows.append([
            Paragraph(prod.name, S["body"]),
            Paragraph(str(prod.qty), ParagraphStyle("c", parent=S["body"], alignment=TA_CENTER)),
            Paragraph(prod.satuan, ParagraphStyle("c", parent=S["body"], alignment=TA_CENTER)),
            Paragraph(prod.tipe, ParagraphStyle("c", parent=S["body"], alignment=TA_CENTER)),
            Paragraph("HSI" if prod.is_hsi else "Non-HSI", ParagraphStyle("c", parent=S["body"], alignment=TA_CENTER)),
            Paragraph(f"Rp {fmt(prod.monthly_price)}", S["mono"]),
            Paragraph(f"Rp {fmt(subtotal)}", S["mono"]),
            Paragraph(f"Rp {fmt(otc_total)}" if otc_total else "—", S["mono"]),
        ])
    # Total row
    prod_rows.append([
        Paragraph("Total Recurring", ParagraphStyle("tb", parent=S["body"], fontName="Helvetica-Bold")),
        "", "", "", "",
        "",
        Paragraph(f"Rp {fmt(total_monthly)}", ParagraphStyle("tbr", parent=S["mono"], fontName="Courier-Bold")),
        Paragraph(f"Rp {fmt(total_otc)}" if total_otc else "—", ParagraphStyle("tbr", parent=S["mono"], fontName="Courier-Bold")),
    ])

    cw_prod = [W - 2*MARGIN - 18*mm - 22*mm - 12*mm - 12*mm - 9*mm - 22*mm - 22*mm,
               9*mm, 14*mm, 18*mm, 14*mm, 22*mm, 22*mm, 22*mm]
    prod_tbl = Table(prod_rows, colWidths=cw_prod, repeatRows=1)
    prod_style = TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), DARK),
        ("ROWBACKGROUNDS",(0,1),(-1,-2),[WHITE, GREY_BG]),
        ("BACKGROUND",   (0,-1),(-1,-1), GREY_BG),
        ("LINEBELOW",    (0,-1),(-1,-1), 1, GREY_LINE),
        ("LINEBELOW",    (0,0), (-1,0),  0.5, GREY_LINE),
        ("GRID",         (0,0), (-1,-1), 0.2, GREY_LINE),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 5),
        ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("FONTNAME",     (0,-1),(0,-1),  "Helvetica-Bold"),
        ("SPAN",         (0,-1),(4,-1)),
        ("LINEABOVE",    (0,-1),(-1,-1), 1, DARK),
    ])
    prod_tbl.setStyle(prod_style)
    story.append(prod_tbl)
    story.append(Spacer(1, 6*mm))

    # ── Income Statement ──────────────────────────────────────────────────────
    story.append(Paragraph("Laporan Laba Rugi (Kontrak Penuh)", S["section"]))

    def pl_row(label, value, indent=False, bold=False, separator=False, badge=None, badge_ok=None):
        lbl_style = ParagraphStyle("pl", parent=S["body"],
                                   leftIndent=indent*8,
                                   fontName="Helvetica-Bold" if bold else "Helvetica",
                                   textColor=BLACK if bold else MUTED if indent else BLACK)
        neg = value is not None and value < 0
        val_style = S["mono_red"] if neg else (S["mono_grn"] if bold else S["mono"])
        val_text = f"(Rp {fmt(-value)})" if neg else (f"Rp {fmt(value)}" if value is not None else "—")

        badge_cell = ""
        if badge is not None:
            color = GREEN if badge_ok else RED
            badge_cell = Paragraph(
                f'<font color="{"#1B7A3E" if badge_ok else "#CC0000"}">{badge}</font>',
                ParagraphStyle("bdg", parent=S["small"], alignment=TA_CENTER)
            )

        return [Paragraph(label, lbl_style), badge_cell, Paragraph(val_text, val_style)], separator

    r = result
    pl_items = [
        ("Revenue",       r.get("total_revenue"),      False, False, False, None,               None),
        ("COGS",          -(r.get("total_cogs") or 0), True,  False, False, None,               None),
        ("Gross Profit",  r.get("total_gross_profit"), False, True,  True,  fmt_pct(r.get("gpm")), r.get("gpm_ok")),
        ("OPEX / O&M",    -(r.get("total_opex") or 0), True,  False, False, None,               None),
        ("EBITDA",        r.get("total_ebitda"),        False, False, True,  None,               None),
        ("Depresiasi",    -(r.get("total_dep") or 0),  True,  False, False, None,               None),
        ("EBIT",          r.get("total_ebit"),          False, False, True,  None,               None),
        ("Pajak (22%)",   -(r.get("total_tax") or 0),  True,  False, False, None,               None),
        ("Net Income",    r.get("total_ni"),            False, True,  True,  fmt_pct(r.get("nim")), r.get("nim_ok")),
    ]

    cw_pl = [(W - 2*MARGIN)*0.55, (W - 2*MARGIN)*0.15, (W - 2*MARGIN)*0.30]
    pl_table_rows = []
    separators = []
    for label, val, indent, bold, sep, badge, badge_ok in pl_items:
        row, do_sep = pl_row(label, val, indent, bold, sep, badge, badge_ok)
        pl_table_rows.append(row)
        separators.append(do_sep)

    pl_tbl = Table(pl_table_rows, colWidths=cw_pl)
    pl_style_cmds = [
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[WHITE, GREY_BG]),
        ("TOPPADDING",   (0,0),(-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("LEFTPADDING",  (0,0),(-1,-1), 8),
        ("RIGHTPADDING", (0,0),(-1,-1), 6),
        ("GRID",         (0,0),(-1,-1), 0.2, GREY_LINE),
    ]
    for i, sep in enumerate(separators):
        if sep:
            pl_style_cmds.append(("LINEBELOW", (0,i),(-1,i), 0.8, DARK))
    pl_tbl.setStyle(TableStyle(pl_style_cmds))
    story.append(pl_tbl)
    story.append(Spacer(1, 6*mm))

    # ── CAPEX ─────────────────────────────────────────────────────────────────
    if inp.capex:
        story.append(Paragraph("Investasi (CAPEX)", S["section"]))
        capex_rows = [
            [Paragraph("Komponen", ParagraphStyle("ch", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold")),
             Paragraph("Nilai", ParagraphStyle("ch", parent=S["label"], textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_RIGHT))],
            [Paragraph("Material (TIF)", S["body"]),          Paragraph(f"Rp {fmt(inp.capex.material)}", S["mono"])],
            [Paragraph("Jasa (TIF)", S["body"]),              Paragraph(f"Rp {fmt(inp.capex.jasa)}", S["mono"])],
            [Paragraph("BOP Lakwas (0.4%)", S["body"]),       Paragraph(f"Rp {fmt(inp.capex.bop_lakwas)}", S["mono"])],
            [Paragraph("Total Investasi", ParagraphStyle("tb", parent=S["body"], fontName="Helvetica-Bold")),
             Paragraph(f"Rp {fmt(inp.capex.total_investasi)}", ParagraphStyle("tbr", parent=S["mono"], fontName="Courier-Bold"))],
        ]
        cw_cap = [(W - 2*MARGIN)*0.6, (W - 2*MARGIN)*0.4]
        cap_tbl = Table(capex_rows, colWidths=cw_cap)
        cap_tbl.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), DARK),
            ("ROWBACKGROUNDS",(0,1),(-1,-2),[WHITE, GREY_BG]),
            ("BACKGROUND",   (0,-1),(-1,-1), GREY_BG),
            ("LINEABOVE",    (0,-1),(-1,-1), 1, DARK),
            ("GRID",         (0,0), (-1,-1), 0.2, GREY_LINE),
            ("TOPPADDING",   (0,0), (-1,-1), 5),
            ("BOTTOMPADDING",(0,0), (-1,-1), 5),
            ("LEFTPADDING",  (0,0), (-1,-1), 8),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(cap_tbl)
        story.append(Spacer(1, 6*mm))

    # ── Key metrics 2×3 grid ─────────────────────────────────────────────────
    story.append(Paragraph("Metrik Kelayakan", S["section"]))

    def metric_cell(label, value, ok, threshold):
        bg = GREEN_BG if ok else RED_LIGHT
        border = GREEN if ok else RED
        mark = "✓" if ok else "✗"
        mark_color = "#1B7A3E" if ok else "#CC0000"
        return Table(
            [[Paragraph(f'<font color="{mark_color}">{mark} </font>{label}',
                        ParagraphStyle("ml", parent=S["label"], fontName="Helvetica-Bold", textColor=MUTED))],
             [Paragraph(value, ParagraphStyle("mv", parent=S["value"], fontSize=10,
                                              textColor=GREEN if ok else RED))],
             [Paragraph(threshold, S["small"])]],
            colWidths=[(W - 2*MARGIN - 8*mm) / 3],
        ), bg, border

    metrics = [
        ("NPV  (WACC 11.35%)", f"Rp {fmt(r.get('npv'))}", bool(r.get("npv_ok")), "Minimum > 0"),
        ("MIRR",               fmt_pct(r.get("mirr")),     bool(r.get("irr_ok")), "Minimum 13.35%"),
        ("Payback Period",     r.get("payback_str","—"),   bool(r.get("pp_ok")),  f"< {inp.kontrak_tahun} Tahun"),
        ("GPM",                fmt_pct(r.get("gpm")),      bool(r.get("gpm_ok")), "Minimum 7%"),
        ("NIM",                fmt_pct(r.get("nim")),      bool(r.get("nim_ok")), "Minimum 2%"),
        ("CAPEX Total",        f"Rp {fmt(r.get('capex_total'))}", True,            "—"),
    ]

    cell_w = (W - 2*MARGIN - 4*mm) / 3
    metric_row1 = []
    metric_row2 = []
    for i, (lbl, val, ok, thr) in enumerate(metrics):
        bg = GREEN_BG if ok else RED_LIGHT
        bdr = GREEN if ok else RED
        mark = "✓" if ok else "✗"
        mc = f'<font color="{"#1B7A3E" if ok else "#CC0000"}">{mark}</font> {lbl}'
        cell = Table(
            [[Paragraph(mc, ParagraphStyle("ml", parent=S["label"], fontName="Helvetica-Bold"))],
             [Paragraph(val or "—", ParagraphStyle("mv", parent=S["value"], fontSize=10,
                                                   textColor=GREEN if ok else BLACK))],
             [Paragraph(thr, S["small"])]],
            colWidths=[cell_w - 4*mm],
        )
        cell.setStyle(TableStyle([
            ("BACKGROUND",   (0,0),(-1,-1), bg),
            ("BOX",          (0,0),(-1,-1), 0.8, bdr),
            ("TOPPADDING",   (0,0),(-1,-1), 6),
            ("BOTTOMPADDING",(0,0),(-1,-1), 6),
            ("LEFTPADDING",  (0,0),(-1,-1), 8),
            ("RIGHTPADDING", (0,0),(-1,-1), 6),
        ]))
        if i < 3:
            metric_row1.append(cell)
        else:
            metric_row2.append(cell)

    m_tbl1 = Table([metric_row1], colWidths=[cell_w, cell_w, cell_w], hAlign="LEFT")
    m_tbl1.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),2),
                                 ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    m_tbl2 = Table([metric_row2], colWidths=[cell_w, cell_w, cell_w], hAlign="LEFT")
    m_tbl2.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),2),
                                 ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    story.append(m_tbl1)
    story.append(Spacer(1, 3*mm))
    story.append(m_tbl2)
    story.append(Spacer(1, 6*mm))

    # ── Tabel per-tahun ───────────────────────────────────────────────────────
    story.append(Paragraph("Proyeksi Per Tahun", S["section"]))
    yr_labels = ["Item", "Tahun 1", "Tahun 2", "Tahun 3", "Tahun 4", "Tahun 5"]
    yr_rows = [
        [Paragraph(l, ParagraphStyle("yh", parent=S["label"], textColor=WHITE,
                                     fontName="Helvetica-Bold",
                                     alignment=TA_CENTER if i > 0 else TA_LEFT))
         for i, l in enumerate(yr_labels)]
    ]

    def yr_row(label, values, bold=False, sep=False):
        style = ParagraphStyle("yr", parent=S["body"],
                               fontName="Helvetica-Bold" if bold else "Helvetica",
                               textColor=BLACK)
        num_style = ParagraphStyle("yn", parent=S["mono"],
                                   fontName="Courier-Bold" if bold else "Courier")
        row = [Paragraph(label, style)]
        for v in values:
            row.append(Paragraph(f"Rp {fmt(v)}" if v is not None else "—", num_style))
        return row, sep

    n = 5
    yr_items = [
        ("Revenue",       r.get("rev_by_year",[0]*n), False, False),
        ("COGS",          r.get("dir_by_year",[0]*n), False, False),
        ("OPEX",          r.get("opx_by_year",[0]*n), False, True),
        ("Net Income",    r.get("ni_by_year", [0]*n), True,  True),
        ("Depresiasi",    r.get("dep_by_year",[0]*n), False, False),
        ("FCF",           r.get("fcf_by_year",[0]*n), False, False),
        ("Akum. FCF",     r.get("acc_fcf",    [0]*n), True,  True),
    ]
    yr_separators = []
    for label, vals, bold, sep in yr_items:
        row, do_sep = yr_row(label, vals or [None]*n, bold, sep)
        yr_rows.append(row)
        yr_separators.append(do_sep)

    cw_yr = [(W-2*MARGIN)*0.22] + [(W-2*MARGIN)*0.156]*5
    yr_tbl = Table(yr_rows, colWidths=cw_yr, repeatRows=1)
    yr_cmds = [
        ("BACKGROUND",    (0,0),(-1,0), DARK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE, GREY_BG]),
        ("GRID",          (0,0),(-1,-1), 0.2, GREY_LINE),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 4),
    ]
    for i, sep in enumerate(yr_separators):
        if sep:
            yr_cmds.append(("LINEBELOW", (0, i+1), (-1, i+1), 0.8, DARK))
    yr_tbl.setStyle(TableStyle(yr_cmds))
    story.append(yr_tbl)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY_LINE))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Dokumen ini dibuat otomatis oleh AKI System · Telkom Indonesia · Hanya untuk keperluan internal",
        ParagraphStyle("footer", parent=S["small"], alignment=TA_CENTER, textColor=MUTED)
    ))

    doc.build(story)
    return buf.getvalue()
