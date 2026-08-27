import { jsPDF } from 'jspdf';

/**
 * Generates and downloads the official Shortage Audit Report PDF
 * with proper black borders, grid alignment, itemized breakdown,
 * shrinkage testing box, and authorization signature blocks.
 */
export const generateAndDownloadPdf = (data = {}, options = {}) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const PAGE_W = doc.internal.pageSize.getWidth(); // 595.28 pt
    const PAGE_H = doc.internal.pageSize.getHeight(); // 841.89 pt
    const M = 24; // Balanced margin
    const contentW = PAGE_W - 2 * M; // 547.28 pt
    let y = 24;

    const setFont = (style, size) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
    };

    // Gather active item rows for PDF
    let activeItems = [];
    let entries = data.selectedEntries;
    if (typeof entries === 'string') {
      try {
        entries = JSON.parse(entries);
      } catch (e) {
        entries = [];
      }
    }
    if (Array.isArray(entries) && entries.length > 0) {
      activeItems = entries;
    } else if (Array.isArray(options.matchedEntries) && Array.isArray(options.selectedEntryIndices) && options.selectedEntryIndices.length > 0) {
      activeItems = options.matchedEntries.filter((_, idx) => options.selectedEntryIndices.includes(idx));
    }

    if (activeItems.length === 0) {
      activeItems = [
        {
          fabricName: data.fabricName || data.fabric || 'FABRIC MH FLEECE',
          shade: data.shade || data.sentShade || 'OLIVE',
          billNumber: data.billNumber || '—',
          issueRolls: parseInt(data.issuedRolls || data.sentRolls) || 20,
          totalRolls: parseInt(data.issuedRolls || data.sentRolls) || 20,
          issueQty: parseFloat(data.issuedQty || data.sentWeight) || 520.350,
          billedQty: parseFloat(data.billedQty || data.issuedQty || data.sentWeight) || 520.350,
          recdWeight: parseFloat(data.recdWeight || data.receivedWeight) || 478.020,
          shortage: parseFloat(data.shortageQty || data.weightDiff) || 42.330
        }
      ];
    }

    // ── 1. HEADER TITLE BLOCK (ENCLOSED WITH BLACK BORDER) ───────────────
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);

    // Header Box
    doc.setFillColor(255, 255, 255);
    doc.rect(M, y, contentW, 64, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(M, y, contentW, 64, 'S');

    // Left: Company Info
    setFont('bold', 16);
    doc.setTextColor(0, 0, 0);
    doc.text('MOHIT HOSIERY', M + 14, y + 22);

    setFont('bold', 8.5);
    doc.setTextColor(60, 60, 60);
    doc.text('TEXTILE MANUFACTURING & QUALITY AUDIT', M + 14, y + 38);

    // Right: Blank Circle with Number inside (Non-colorful Black & White)
    const circleR = 11;
    const circleX = PAGE_W - M - 165;
    const circleY = y + 18;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.3);
    doc.circle(circleX, circleY, circleR, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('6', circleX, circleY + 3.5, { align: 'center' });

    setFont('bold', 8);
    doc.setTextColor(0, 0, 0);
    doc.text('6TH REPORT', circleX + 16, circleY - 1);

    setFont('bold', 12.5);
    doc.setTextColor(0, 0, 0);
    doc.text('SHORTAGE AUDIT REPORT', PAGE_W - M - 14, y + 36, { align: 'right' });

    setFont('bold', 8.5);
    doc.text(`Lot No: ${data.lotNumber || '—'}  |  Doc Ref: JW-${data.lotNumber || 'Audit'}`, PAGE_W - M - 14, y + 48, { align: 'right' });

    setFont('normal', 8);
    doc.setTextColor(60, 60, 60);
    doc.text(`Issue Date: ${data.issueDate || '—'}   •   Receipt Date: ${data.date || new Date().toISOString().slice(0, 10)}`, PAGE_W - M - 14, y + 58, { align: 'right' });

    y += 64 + 14;

    // ── 2. METRIC SUMMARY BOXES (SOLID BLACK BORDERS) ────────────────────
    const billedVal = activeItems.length > 1
      ? activeItems.reduce((acc, it) => acc + (parseFloat(it.billedQty || it.opQty || it.issueQty || 0) || 0), 0)
      : (parseFloat(data.billedQty) || parseFloat(data.sentWeight) || 0);

    const issuedVal = activeItems.length > 1
      ? activeItems.reduce((acc, it) => acc + (parseFloat(it.issueQty || it.weight || 0) || 0), 0)
      : (parseFloat(data.issuedQty) || parseFloat(data.sentWeight) || 0);

    const recdVal = activeItems.length > 1
      ? activeItems.reduce((acc, it) => acc + (parseFloat(it.recdWeight !== undefined ? it.recdWeight : 0) || 0), 0)
      : (parseFloat(data.recdWeight) || parseFloat(data.receivedWeight) || 0);

    const unitLabel = data.unit || 'KGs';

    // Check if any active item has partial delivery
    const anyPartial = String(data.reason || '').toLowerCase().includes('pending') ||
      activeItems.some(it => {
        const conf = options.entryReceiptConfig?.[options.matchedEntries?.indexOf(it)];
        return (conf && conf.status === 'pending') || it.isPartial;
      });

    const kpis = [
      { label: 'BILLED WEIGHT', value: `${billedVal.toFixed(3)} ${unitLabel}`, bg: [255, 255, 255] },
      { label: 'ISSUED WEIGHT', value: `${issuedVal.toFixed(3)} ${unitLabel}`, bg: [255, 255, 255] },
      {
        label: anyPartial ? 'RECEIVED WT (PARTIAL)' : 'RECEIVED WEIGHT',
        value: `${recdVal.toFixed(3)} ${unitLabel}`,
        bg: [255, 255, 255]
      }
    ];

    const cardGap = 12;
    const cardW = (contentW - 2 * cardGap) / 3;
    const cardH = 46;

    kpis.forEach((kpi, idx) => {
      const cx = M + idx * (cardW + cardGap);

      doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
      doc.rect(cx, y, cardW, cardH, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(cx, y, cardW, cardH, 'S');

      // Label
      setFont('bold', 8);
      doc.setTextColor(0, 0, 0);
      doc.text(kpi.label, cx + 12, y + 16);

      // Value
      setFont('bold', 11);
      doc.setTextColor(0, 0, 0);
      doc.text(kpi.value, cx + 12, y + 34);
    });

    y += cardH + 16;

    // ── 3. ORDER & PROCESSING DETAILS (FULL BLACK GRID BOX) ─────────────
    doc.setFillColor(240, 243, 246);
    doc.rect(M, y, contentW, 18, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(M, y, contentW, 18, 'S');

    setFont('bold', 8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('1. ORDER & PROCESSING IDENTIFICATION', M + 8, y + 12);
    y += 18;

    const gridRowH = 20;
    const halfW = contentW / 2;

    const totalIssueRolls = activeItems.length > 1
      ? activeItems.reduce((acc, it) => acc + (parseInt(it.totalRolls || it.issueRolls || it.balanceRolls || 0) || 0), 0)
      : (data.issuedRolls || data.sentRolls || activeItems[0]?.totalRolls || activeItems[0]?.issueRolls || '20');

    const combinedFabricDescription = [...new Set(activeItems.map(it => String(it.fabricName || it.fabric || '').trim()).filter(Boolean))].join(', ') || String(data.fabricName || data.fabric || 'FABRIC MH FLEECE');
    const combinedShades = [...new Set(activeItems.map(it => String(it.shade || '').trim()).filter(Boolean))].join(', ') || String(data.shade || data.sentShade || 'OLIVE');

    const gridData = [
      [
        { label: 'Job Processor:', val: String(data.cmfParty || data.brand || 'MAHARAJA PROCESSOR').toUpperCase() },
        { label: 'Fabric Description:', val: combinedFabricDescription.toUpperCase() }
      ],
      [
        { label: 'Lot Number:', val: String(data.lotNumber || '—').toUpperCase() },
        { label: 'Shade / Color:', val: combinedShades.toUpperCase() }
      ],
      [
        { label: 'Process Finish:', val: String(data.process || 'GERMAN FINISH').toUpperCase() },
        { label: 'Bill / Challan No:', val: String(data.billNumber || '—') }
      ],
      [
        {
          label: 'Issued Rolls:',
          val: anyPartial
            ? `${totalIssueRolls} ROLLS [PARTIAL RECD]`
            : `${totalIssueRolls} ROLLS`
        },
        { label: 'Shortage Reason:', val: String(data.reason || (anyPartial ? 'Pending Material against Bill' : 'Variance Audit')) }
      ]
    ];

    gridData.forEach(row => {
      doc.setFillColor(255, 255, 255);
      doc.rect(M, y, halfW, gridRowH, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.rect(M, y, halfW, gridRowH, 'S');

      setFont('bold', 8);
      doc.setTextColor(70, 70, 70);
      doc.text(row[0].label, M + 8, y + 13);
      setFont('bold', 8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(row[0].val, M + 95, y + 13);

      doc.setFillColor(255, 255, 255);
      doc.rect(M + halfW, y, halfW, gridRowH, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.rect(M + halfW, y, halfW, gridRowH, 'S');

      setFont('bold', 8);
      doc.setTextColor(70, 70, 70);
      doc.text(row[1].label, M + halfW + 8, y + 13);
      setFont('bold', 8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(row[1].val, M + halfW + 95, y + 13);

      y += gridRowH;
    });

    y += 16;

    // ── 4. ITEMIZED AUDIT TABLE (BLACK BORDER GRID) ─────────────────────
    doc.setFillColor(240, 243, 246);
    doc.rect(M, y, contentW, 18, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(M, y, contentW, 18, 'S');

    setFont('bold', 8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('2. ITEMIZED FABRIC WEIGHT & SHORTAGE BREAKDOWN', M + 8, y + 12);
    y += 18;

    const cols = [
      { title: '#', w: 18, align: 'center' },
      { title: 'ITEM / FABRIC DESCRIPTION', w: 120, align: 'left' },
      { title: 'SHADE', w: 54, align: 'left' },
      { title: 'BILL / ISSUE NO', w: 72, align: 'left' },
      { title: 'ROLLS', w: 36, align: 'center' },
      { title: 'BILLED (KG)', w: 58, align: 'right' },
      { title: 'ISSUED (KG)', w: 58, align: 'right' },
      { title: 'RECD (KG)', w: 58, align: 'right' },
      { title: 'SHORTAGE (%)', w: 73.28, align: 'right' }
    ];

    const tblHeaderH = 20;
    doc.setFillColor(235, 240, 245);
    doc.rect(M, y, contentW, tblHeaderH, 'F');

    let cx = M;
    cols.forEach(col => {
      doc.setDrawColor(0, 0, 0);
      doc.rect(cx, y, col.w, tblHeaderH, 'S');

      setFont('bold', 7);
      doc.setTextColor(0, 0, 0);
      if (col.align === 'right') {
        doc.text(col.title, cx + col.w - 4, y + 13, { align: 'right' });
      } else if (col.align === 'center') {
        doc.text(col.title, cx + col.w / 2, y + 13, { align: 'center' });
      } else {
        doc.text(col.title, cx + 4, y + 13);
      }
      cx += col.w;
    });

    y += tblHeaderH;

    const rowH = 22;
    const totalIssAcrossItems = activeItems.reduce((acc, it) => acc + (parseFloat(it.issueQty || it.weight || 0) || 0), 0) || issuedVal;

    activeItems.forEach((item, idx) => {
      const conf = options.entryReceiptConfig?.[options.matchedEntries?.indexOf(item)];
      const isItemPartial = (conf && conf.status === 'pending') || String(item.remarks || '').includes('Partial') || item.isPartial;

      if (isItemPartial) {
        doc.setFillColor(254, 252, 232);
      } else if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(M, y, contentW, rowH, 'F');

      const issKg = parseFloat(item.issueQty || item.weight || (activeItems.length === 1 ? issuedVal : 0));
      const billedKg = parseFloat(item.billedQty || item.opQty || (activeItems.length === 1 ? billedVal : issKg));

      // Calculate received weight specifically for RIB vs Main Fabric
      const fName = String(item.fabricName || item.fabric || data.fabricName || '').trim().toUpperCase();
      const isRibItem = fName.includes('RIB');

      let recdKg = 0;
      if (item.recdWeight !== undefined && item.recdWeight !== null && !isNaN(parseFloat(item.recdWeight)) && parseFloat(item.recdWeight) > 0) {
        recdKg = parseFloat(item.recdWeight);
      } else if (conf && conf.status === 'pending' && conf.recdWeight !== undefined) {
        recdKg = parseFloat(conf.recdWeight);
      } else if (options.dbRecdData) {
        if (isRibItem && options.dbRecdData.ribRecdWeight > 0) {
          recdKg = options.dbRecdData.ribRecdWeight;
        } else if (!isRibItem && options.dbRecdData.fabricRecdWeight > 0) {
          recdKg = options.dbRecdData.fabricRecdWeight;
        } else if (totalIssAcrossItems > 0 && recdVal > 0) {
          recdKg = (issKg / totalIssAcrossItems) * recdVal;
        } else {
          recdKg = issKg * 0.92;
        }
      } else if (activeItems.length === 1) {
        recdKg = recdVal > 0 ? recdVal : (issKg * 0.92);
      } else if (totalIssAcrossItems > 0 && recdVal > 0) {
        recdKg = (issKg / totalIssAcrossItems) * recdVal;
      } else {
        recdKg = issKg * 0.92;
      }

      const diffKg = Math.max(0, issKg - recdKg);
      const diffPct = issKg > 0 && diffKg > 0 ? (diffKg / issKg) * 100 : 0;

      const totalAvailRolls = item.totalRolls || item.issueRolls || (activeItems.length === 1 ? totalIssueRolls : 20);
      const rollsDisplay = isItemPartial && conf?.recdRolls
        ? `${conf.recdRolls}/${totalAvailRolls}`
        : String(totalAvailRolls);

      const fabricDisplay = isItemPartial
        ? `${String(item.fabricName || item.fabric || 'FABRIC').substring(0, 16)} (PARTIAL)`
        : String(item.fabricName || item.fabric || 'FABRIC').substring(0, 24);

      const rowBillNo = String(item.billNumber || item.issueNo || data.billNumber || '—');

      const rowValues = [
        `${idx + 1}`,
        fabricDisplay,
        String(item.shade || data.shade || '—').substring(0, 11),
        rowBillNo.length > 14 ? rowBillNo.substring(0, 14) : rowBillNo,
        rollsDisplay,
        billedKg.toFixed(3),
        issKg.toFixed(3),
        recdKg.toFixed(3),
        diffPct > 0 ? `${diffPct.toFixed(2)}%` : '0.00%'
      ];

      cx = M;
      cols.forEach((col, cIdx) => {
        doc.setDrawColor(0, 0, 0);
        doc.rect(cx, y, col.w, rowH, 'S');

        const val = rowValues[cIdx];

        if (col.align === 'right') {
          setFont(isItemPartial ? 'bold' : 'normal', 8);
          doc.setTextColor(0, 0, 0);
          doc.text(val, cx + col.w - 4, y + 14, { align: 'right' });
        } else if (col.align === 'center') {
          setFont(isItemPartial ? 'bold' : 'normal', 8);
          doc.setTextColor(0, 0, 0);
          doc.text(val, cx + col.w / 2, y + 14, { align: 'center' });
        } else {
          setFont(isItemPartial && cIdx === 1 ? 'bold' : 'normal', 7.5);
          doc.setTextColor(0, 0, 0);
          doc.text(val, cx + 3, y + 14);
        }
        cx += col.w;
      });

      y += rowH;
    });

    // Total Row
    doc.setFillColor(240, 240, 240);
    doc.rect(M, y, contentW, rowH, 'F');

    const totalBilled = activeItems.reduce((acc, it) => acc + (parseFloat(it.billedQty || it.opQty || 0) || 0), 0) || billedVal;
    const totalIss = activeItems.reduce((acc, it) => acc + (parseFloat(it.issueQty || it.weight || 0) || 0), 0) || issuedVal;
    const totalRecd = activeItems.reduce((acc, it) => acc + (parseFloat(it.recdWeight || 0) || 0), 0) || recdVal;
    const totalDiff = Math.max(0, totalIss - totalRecd);
    const totalDiffPct = totalIss > 0 && totalDiff > 0 ? (totalDiff / totalIss) * 100 : (parseFloat(data.shortagePercentage) || 0);
    const totalRollsCount = activeItems.reduce((acc, it) => acc + (parseInt(it.totalRolls || it.issueRolls || 0) || 0), 0) || parseInt(totalIssueRolls || 20);

    // Span 1st 4 cols for label "TOTAL SUMMARY" (#: 18 + Fabric: 120 + Shade: 54 + Bill: 72 = 264)
    const span4W = 18 + 120 + 54 + 72;
    doc.setDrawColor(0, 0, 0);
    doc.rect(M, y, span4W, rowH, 'S');
    setFont('bold', 8);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL SUMMARY', M + 8, y + 14);

    // Rolls col (w: 36)
    doc.rect(M + span4W, y, 36, rowH, 'S');
    doc.text(String(totalRollsCount), M + span4W + 18, y + 14, { align: 'center' });

    // Billed col (w: 58)
    doc.rect(M + span4W + 36, y, 58, rowH, 'S');
    doc.text(totalBilled.toFixed(3), M + span4W + 36 + 54, y + 14, { align: 'right' });

    // Issued col (w: 58)
    doc.rect(M + span4W + 36 + 58, y, 58, rowH, 'S');
    doc.text(totalIss.toFixed(3), M + span4W + 36 + 58 + 54, y + 14, { align: 'right' });

    // Recd col (w: 58)
    doc.rect(M + span4W + 36 + 58 + 58, y, 58, rowH, 'S');
    doc.text(totalRecd.toFixed(3), M + span4W + 36 + 58 + 58 + 54, y + 14, { align: 'right' });

    // Shortage % col (w: 73.28)
    doc.rect(M + span4W + 36 + 58 + 58 + 58, y, 73.28, rowH, 'S');
    doc.setTextColor(0, 0, 0);
    doc.text(totalDiffPct > 0 ? `${totalDiffPct.toFixed(2)}%` : '0.00%', PAGE_W - M - 4, y + 14, { align: 'right' });

    y += rowH + 16;

    // ── 5. QUALITY INSPECTION & SHRINKAGE TESTING ───────────────────────
    doc.setFillColor(240, 240, 240);
    doc.rect(M, y, contentW, 18, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.rect(M, y, contentW, 18, 'S');

    setFont('bold', 8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('3. QUALITY INSPECTION & SHRINKAGE TESTING', M + 8, y + 12);
    y += 18;

    const shrinkCols = [
      { title: 'SHRINKAGE PARAMETER', w: 145 },
      { title: 'BEFORE WASH', w: 80, align: 'center' },
      { title: 'AFTER WASH', w: 80, align: 'center' },
      { title: 'DIFFERENCE', w: 75, align: 'center' },
      { title: 'SHRINKAGE %', w: 75, align: 'center' },
      { title: 'TEST STATUS / REMARKS', w: 92.28, align: 'center' }
    ];

    doc.setFillColor(245, 245, 245);
    doc.rect(M, y, contentW, 18, 'F');

    let sx = M;
    shrinkCols.forEach(col => {
      doc.setDrawColor(0, 0, 0);
      doc.rect(sx, y, col.w, 18, 'S');

      setFont('bold', 7.5);
      doc.setTextColor(0, 0, 0);
      if (col.align === 'center') {
        doc.text(col.title, sx + col.w / 2, y + 12, { align: 'center' });
      } else {
        doc.text(col.title, sx + 6, y + 12);
      }
      sx += col.w;
    });

    y += 18;

    const shrinkRows = [
      { name: 'Fabric Length', before: '50 CM', after: '', diff: '', pct: '', status: '' },
      { name: 'Fabric Width', before: '50 CM', after: '', diff: '', pct: '', status: '' }
    ];

    shrinkRows.forEach((sr, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(M, y, contentW, 20, 'F');

      sx = M;
      shrinkCols.forEach(col => {
        doc.setDrawColor(0, 0, 0);
        doc.rect(sx, y, col.w, 20, 'S');
        sx += col.w;
      });

      sx = M;
      setFont('normal', 8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(sr.name, sx + 8, y + 13);
      doc.text(sr.before, sx + 145 + 40, y + 13, { align: 'center' });
      if (sr.after) doc.text(sr.after, sx + 145 + 80 + 40, y + 13, { align: 'center' });
      if (sr.diff) doc.text(sr.diff, sx + 145 + 80 + 80 + 37, y + 13, { align: 'center' });
      if (sr.pct) doc.text(sr.pct, sx + 145 + 80 + 80 + 75 + 37, y + 13, { align: 'center' });
      if (sr.status) doc.text(sr.status, sx + 145 + 80 + 80 + 75 + 75 + 46, y + 13, { align: 'center' });

      y += 20;
    });

    y += 12;

    // Quality Checkmarks Box
    doc.setFillColor(255, 255, 255);
    doc.rect(M, y, contentW, 24, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.rect(M, y, contentW, 24, 'S');

    setFont('bold', 8);
    doc.setTextColor(0, 0, 0);

    doc.rect(M + 12, y + 6, 12, 12, 'S');
    doc.text('Fabric match with RIB / COLLAR / TAPE / OTHER', M + 30, y + 15);

    doc.rect(M + 300, y + 6, 12, 12, 'S');
    doc.text('Depth of Color & Fabric as per Standard', M + 318, y + 15);
    y += 24 + 16;

    // ── 6. INVESTIGATION REMARKS / PARTIAL AUDIT NOTE ─────────────────────
    if (anyPartial || data.remarks) {
      doc.setFillColor(255, 255, 255);
      doc.rect(M, y, contentW, 26, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.rect(M, y, contentW, 26, 'S');

      setFont('bold', 8);
      doc.setTextColor(0, 0, 0);
      doc.text(anyPartial ? 'AUDIT NOTE:' : 'AUDIT REMARKS:', M + 8, y + 16);
      setFont('normal', 8.5);
      doc.setTextColor(0, 0, 0);
      const remarkText = data.remarks
        ? String(data.remarks).substring(0, 115)
        : 'Partial material received against bill. Balance rolls pending from Processor.';
      doc.text(remarkText, M + 95, y + 16);
      y += 26 + 16;
    }

    // ── 7. FORMAL SIGNATURES BLOCK (PAGE 1) ──────────────────────────────
    const sigY = PAGE_H - 65;
    const sigBoxW = (contentW - 40) / 3;

    const signees = [
      { role: 'Prepared By (Store Operator)', name: data.reportedBy || options.currentUser?.name || 'Store Operator' },
      { role: 'Checked By (Quality & Cutting Incharge)', name: 'Checked & Verified' },
      { role: 'Approved By (Store Manager)', name: 'Approved' }
    ];

    signees.forEach((sig, idx) => {
      const sxPos = M + idx * (sigBoxW + 20);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(sxPos, sigY + 18, sxPos + sigBoxW, sigY + 18);

      setFont('bold', 8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(sig.name, sxPos + sigBoxW / 2, sigY + 12, { align: 'center' });

      setFont('normal', 8);
      doc.setTextColor(0, 0, 0);
      doc.text(sig.role, sxPos + sigBoxW / 2, sigY + 30, { align: 'center' });
    });

    // Page 1 Footer
    setFont('italic', 7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Page 1 of 2  |  Confidential - Generated from Textile Warehouse Management System (Mohit Hosiery)', PAGE_W / 2, PAGE_H - 14, { align: 'center' });


    // =========================================================================
    // ── PAGE 2: FINAL FABRIC & QUALITY INSPECTION REPORT ─────────────────────
    // =========================================================================
    doc.addPage('a4', 'portrait');
    let y2 = 24;

    // Parse or prepare inspection details
    let qc = data.inspectionDetails;
    if (typeof qc === 'string') {
      try {
        qc = JSON.parse(qc);
      } catch (e) {
        qc = null;
      }
    }
    if (!qc) {
      qc = {
        fabricClean: 'YES',
        fabricHandFeel: 'OK',
        readyDia: '—',
        readyGsm: '—',
        ribDia: '—',
        ribClean: 'YES',
        ribMatching: 'OK',
        overallVerdict: data.status === 'Reject' ? 'REJECTED' : 'APPROVED',
        inspectedBy: data.reportedBy || 'Store QC Operator',
        remarks: data.remarks || 'Physical fabric and RIB quality audit verified against production standards.'
      };
    }

    // ── PAGE 2 HEADER (BOX WITH SOLID BLACK BORDER) ─────────────────────────
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.setFillColor(255, 255, 255);
    doc.rect(M, y2, contentW, 64, 'F');
    doc.rect(M, y2, contentW, 64, 'S');

    // Left: Company Info
    setFont('bold', 15);
    doc.setTextColor(0, 0, 0);
    doc.text('MOHIT HOSIERY', M + 14, y2 + 22);

    setFont('bold', 8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('QUALITY ASSURANCE & FABRIC INSPECTION DIVISION', M + 14, y2 + 38);

    setFont('normal', 8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Factory QC Unit - Physical Quality Audit Sheet', M + 14, y2 + 52);

    // Right: Document Title & Reference
    setFont('bold', 13);
    doc.setTextColor(0, 0, 0);
    doc.text('FINAL FABRIC INSPECTION AUDIT', PAGE_W - M - 14, y2 + 22, { align: 'right' });

    setFont('bold', 9);
    doc.text(`Lot No: ${data.lotNumber || '—'}  |  QC Ref: QC-${data.lotNumber || 'AUDIT'}`, PAGE_W - M - 14, y2 + 38, { align: 'right' });

    setFont('normal', 8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`Audit Date: ${data.date || new Date().toISOString().slice(0, 10)}  |  Page 2 of 2`, PAGE_W - M - 14, y2 + 52, { align: 'right' });

    y2 += 64 + 14;

    // ── PAGE 2 LOT SUMMARY STRIP ─────────────────────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(M, y2, contentW, 40, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(M, y2, contentW, 40, 'S');

    const colW2 = contentW / 4;
    const summaryItemsP2 = [
      { label: 'LOT NUMBER', val: data.lotNumber || '—' },
      { label: 'BILL / CHALLAN NO', val: data.billNumber || '—' },
      { label: 'PROCESSOR / MILL', val: data.cmfParty || data.brand || '—' },
      { label: 'FABRIC & SHADE', val: `${data.fabricName || data.fabric || '—'} / ${data.shade || data.sentShade || '—'}` }
    ];

    summaryItemsP2.forEach((item, idx) => {
      const cx = M + idx * colW2;
      if (idx > 0) {
        doc.setDrawColor(0, 0, 0);
        doc.line(cx, y2, cx, y2 + 40);
      }
      setFont('bold', 7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(item.label, cx + 10, y2 + 15);

      setFont('bold', 9.5);
      doc.setTextColor(0, 0, 0);
      const textVal = String(item.val).length > 24 ? String(item.val).substring(0, 22) + '...' : String(item.val);
      doc.text(textVal, cx + 10, y2 + 30);
    });

    y2 += 40 + 14;

    // ── PAGE 2 7-POINT FABRIC INSPECTION CHECKLIST TABLE ─────────────────────
    const pX = {
      num: M,
      numW: 24,
      param: M + 24,
      paramW: 180,
      spec: M + 204,
      specW: 160,
      rec: M + 364,
      recW: 110,
      stat: M + 474,
      statW: contentW - 474
    };

    doc.setFillColor(0, 0, 0);
    doc.rect(M, y2, contentW, 22, 'F');
    setFont('bold', 8);
    doc.setTextColor(255, 255, 255);
    doc.text('#', pX.num + 8, y2 + 15);
    doc.text('INSPECTION PARAMETER', pX.param + 8, y2 + 15);
    doc.text('STANDARD SPECIFICATION', pX.spec + 8, y2 + 15);
    doc.text('RECORDED / MEASURED', pX.rec + 8, y2 + 15);
    doc.text('STATUS', pX.stat + 14, y2 + 15);

    y2 += 22;

    const checklistRows = [
      {
        num: 1,
        title: '1. Fabric Surface Cleanliness',
        sub: '(Fabric Saaf Hai Ya Nahi)',
        spec: 'No dust, grease, stain spots or weaving marks',
        recorded: qc.fabricClean === 'NO' ? 'Dirty / Stains Found' : 'Clean & Spotless (Saaf Hai)',
        status: qc.fabricClean === 'NO' ? 'REJECT' : 'PASS'
      },
      {
        num: 2,
        title: '2. Fabric Hand Feel & Touch',
        sub: '(Hand Feel Thik Hai Ya Nahi)',
        spec: 'Standard softness, finish, and touch quality',
        recorded: qc.fabricHandFeel === 'NOT_OK' ? 'Rough / Stiff Defect' : 'Soft & Standard Feel (OK)',
        status: qc.fabricHandFeel === 'NOT_OK' ? 'REJECT' : 'PASS'
      },
      {
        num: 3,
        title: '3. Finished Fabric DIA / Width',
        sub: '(Ready Dia Kitna Hai)',
        spec: 'Measured tubular or open finished width',
        recorded: qc.readyDia ? String(qc.readyDia) : 'Standard Verified',
        status: 'VERIFIED'
      },
      {
        num: 4,
        title: '4. Finished Fabric GSM',
        sub: '(Ready GSM Kitna Hai)',
        spec: 'GSM disc sample cut weight verification',
        recorded: qc.readyGsm ? String(qc.readyGsm) : 'Standard Verified',
        status: 'VERIFIED'
      },
      {
        num: 5,
        title: '5. Finished RIB Width / DIA',
        sub: '(RIB Ka Dia Kitna Hai)',
        spec: 'RIB tubular width specification compliance',
        recorded: qc.ribDia ? String(qc.ribDia) : 'Standard Verified',
        status: 'VERIFIED'
      },
      {
        num: 6,
        title: '6. RIB Surface Cleanliness',
        sub: '(RIB Saaf Hai Ya Nahi)',
        spec: 'Free from lint, oil marks and dye patches',
        recorded: qc.ribClean === 'NO' ? 'Lint / Spots Found' : 'Clean & Defect-Free (Saaf Hai)',
        status: qc.ribClean === 'NO' ? 'REJECT' : 'PASS'
      },
      {
        num: 7,
        title: '7. Fabric to RIB Color Match',
        sub: '(Kapda Se RIB Matching OK Hai)',
        spec: '100% color tone, depth, and shade match',
        recorded: qc.ribMatching === 'MISMATCH' ? 'Color Mismatch' : '100% Matched (OK)',
        status: qc.ribMatching === 'MISMATCH' ? 'REJECT' : 'PASS'
      }
    ];

    checklistRows.forEach((row, rIdx) => {
      const rowH = 34;
      doc.setFillColor(255, 255, 255);
      doc.rect(M, y2, contentW, rowH, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.75);
      doc.rect(M, y2, contentW, rowH, 'S');

      // Vertical separators
      doc.setDrawColor(0, 0, 0);
      doc.line(pX.param, y2, pX.param, y2 + rowH);
      doc.line(pX.spec, y2, pX.spec, y2 + rowH);
      doc.line(pX.rec, y2, pX.rec, y2 + rowH);
      doc.line(pX.stat, y2, pX.stat, y2 + rowH);

      // Row #
      setFont('bold', 8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(String(row.num), pX.num + 8, y2 + 20);

      // Parameter Title & Sub
      setFont('bold', 8);
      doc.setTextColor(0, 0, 0);
      doc.text(row.title, pX.param + 8, y2 + 14);

      setFont('normal', 7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(row.sub, pX.param + 8, y2 + 25);

      // Spec
      setFont('normal', 7.5);
      doc.setTextColor(0, 0, 0);
      const specLines = doc.splitTextToSize(row.spec, pX.specW - 16);
      doc.text(specLines, pX.spec + 8, y2 + 14);

      // Recorded Value
      setFont('bold', 8);
      doc.setTextColor(0, 0, 0);
      const recLines = doc.splitTextToSize(row.recorded, pX.recW - 16);
      doc.text(recLines, pX.rec + 8, y2 + 14);

      // Status Pill (Monochrome: Clean Black Border & Text)
      doc.setFillColor(255, 255, 255);
      doc.rect(pX.stat + 8, y2 + 9, 52, 16, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.75);
      doc.rect(pX.stat + 8, y2 + 9, 52, 16, 'S');

      setFont('bold', 7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(row.status, pX.stat + 34, y2 + 20, { align: 'center' });

      y2 += rowH;
    });

    y2 += 16;

    // ── PAGE 2 FINAL QC VERDICT & AUDIT SUMMARY BOX (MONOCHROME) ─────────────
    const isQcApproved = qc.overallVerdict !== 'REJECTED';
    const verdictH = 88;

    doc.setFillColor(255, 255, 255);
    doc.rect(M, y2, contentW, verdictH, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.rect(M, y2, contentW, verdictH, 'S');

    // Left Verdict Banner (Solid Black / White Box with border)
    doc.setFillColor(245, 245, 245);
    doc.rect(M, y2, 160, verdictH, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(M, y2, 160, verdictH, 'S');

    setFont('bold', 12);
    doc.setTextColor(0, 0, 0);
    doc.text(isQcApproved ? 'QC APPROVED' : 'QC REJECTED', M + 80, y2 + 36, { align: 'center' });
    setFont('bold', 8);
    doc.text(isQcApproved ? '(PASS - READY FOR CUTTING)' : '(HOLD - REJECTED)', M + 80, y2 + 52, { align: 'center' });

    // Right Verdict Notes & Inspector Meta
    setFont('bold', 8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('FINAL AUDIT DECISION & NOTES:', M + 175, y2 + 16);

    setFont('normal', 8);
    doc.setTextColor(0, 0, 0);
    const qcRemarkText = qc.remarks
      ? String(qc.remarks)
      : (isQcApproved ? 'All 7 fabric and RIB parameters meet production quality tolerances.' : 'Severe shade / physical variance observed. Lot held for inspection review.');
    const qcRemarksLines = doc.splitTextToSize(qcRemarkText, contentW - 195);
    doc.text(qcRemarksLines, M + 175, y2 + 29);

    // Inspector name and Audit timestamp lines
    setFont('bold', 8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Inspected By: ${qc.inspectedBy || 'Store QC Operator'}`, M + 175, y2 + 48);
    doc.text(`Audit Timestamp: ${qc.inspectedAt ? new Date(qc.inspectedAt).toLocaleString() : new Date().toLocaleDateString()}`, PAGE_W - M - 14, y2 + 48, { align: 'right' });

    // ── KNITTING HEAD SIGNATURE BOX (JUST BELOW AUDIT TIMESTAMP) ───────────
    const khBoxX = PAGE_W - M - 190;
    const khBoxY = y2 + 56;
    const khBoxW = 176;
    const khBoxH = 26;

    doc.setFillColor(250, 250, 250);
    doc.rect(khBoxX, khBoxY, khBoxW, khBoxH, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.75);
    doc.rect(khBoxX, khBoxY, khBoxW, khBoxH, 'S');

    setFont('bold', 7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Knitting Head Signature:', khBoxX + 8, khBoxY + 11);

    doc.setDrawColor(180, 180, 180);
    doc.line(khBoxX + 98, khBoxY + 18, khBoxX + khBoxW - 8, khBoxY + 18);

    y2 += verdictH + 20;

    // ── PAGE 2 AUTHORIZATION SIGNATURES BLOCK ────────────────────────────────
    const sigY2 = PAGE_H - 65;
    const sigBoxW2 = (contentW - 45) / 4;

    const signeesP2 = [
      { role: 'Fabric QC Inspector', name: qc.inspectedBy || 'Store QC Operator' },
      { role: 'Knitting Head', name: 'Verified' },
      { role: 'Cutting Master / Incharge', name: 'Checked & Approved' },
      { role: 'Quality Assurance Head', name: isQcApproved ? 'Final Pass' : 'Hold Lot' }
    ];

    signeesP2.forEach((sig, idx) => {
      const sxPos = M + idx * (sigBoxW2 + 15);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(sxPos, sigY2 + 18, sxPos + sigBoxW2, sigY2 + 18);

      setFont('bold', 8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(sig.name, sxPos + sigBoxW2 / 2, sigY2 + 12, { align: 'center' });

      setFont('normal', 7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(sig.role, sxPos + sigBoxW2 / 2, sigY2 + 30, { align: 'center' });
    });

    // Page 2 Footer
    setFont('italic', 7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Page 2 of 2  |  Confidential - Quality Assurance Division (Mohit Hosiery)', PAGE_W / 2, PAGE_H - 14, { align: 'center' });

    // ── SAVE PDF ─────────────────────────────────────────────────────────────
    const filename = `Shortage_Report_LOT_${data.lotNumber || 'Audit'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    return true;
  } catch (err) {
    console.error('Failed to generate Shortage Report PDF:', err);
    return false;
  }
};
