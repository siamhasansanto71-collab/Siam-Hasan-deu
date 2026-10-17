import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileJson, 
  Calendar, 
  User, 
  CheckCircle, 
  Sparkles,
  Loader2,
  RefreshCw
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { useLedger } from '../context/LedgerContext';
import { Customer, Transaction } from '../types/ledger';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose,
  initialCustomerId 
}) => {
  const { customers, stats, allTransactions, pharmacyProfile } = useLedger();
  const statementRef = useRef<HTMLDivElement>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || 'all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last7' | 'thisMonth'>('all');
  const [reportLayout, setReportLayout] = useState<'summary' | 'detailed'>('summary');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Sync selectedCustomerId when modal opens or initialCustomerId changes
  React.useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    } else {
      setSelectedCustomerId('all');
    }
  }, [initialCustomerId, isOpen]);

  // Lookup map for customer name & phone
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const selectedCustomerObj = selectedCustomerId !== 'all' 
    ? customerMap.get(selectedCustomerId) 
    : null;

  // 1. Consolidated summary per customer (Single Row per Account)
  const customerSummaryRows = useMemo(() => {
    const targetCustomers = selectedCustomerId === 'all'
      ? [...customers]
      : customers.filter((c) => c.id === selectedCustomerId);

    // Group transactions by customerId
    const txByCustomer = new Map<string, typeof allTransactions>();
    allTransactions.forEach((tx) => {
      const list = txByCustomer.get(tx.customerId) || [];
      list.push(tx);
      txByCustomer.set(tx.customerId, list);
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    return targetCustomers.map((cust, idx) => {
      let customerTxList = txByCustomer.get(cust.id) || [];

      // Filter transactions by date if active
      if (dateFilter === 'today') {
        customerTxList = customerTxList.filter((tx) => {
          const tTime = new Date(tx.createdAt || tx.date).getTime();
          return tTime >= startOfToday;
        });
      } else if (dateFilter === 'last7') {
        customerTxList = customerTxList.filter((tx) => {
          const tTime = new Date(tx.createdAt || tx.date).getTime();
          return tTime >= sevenDaysAgo;
        });
      } else if (dateFilter === 'thisMonth') {
        customerTxList = customerTxList.filter((tx) => {
          const tTime = new Date(tx.createdAt || tx.date).getTime();
          return tTime >= startOfMonth;
        });
      }

      let txDueSum = 0;
      let txPaymentSum = 0;

      customerTxList.forEach((tx) => {
        if (tx.type === 'due') {
          txDueSum += tx.amount;
        } else if (tx.type === 'payment') {
          txPaymentSum += tx.amount;
        } else if (tx.type === 'adjustment') {
          if (tx.newBalance > tx.previousBalance) {
            txDueSum += tx.newBalance - tx.previousBalance;
          } else {
            txPaymentSum += tx.previousBalance - tx.newBalance;
          }
        }
      });

      let totalDue = txDueSum;
      let totalPayment = txPaymentSum;
      let currentBalance = cust.totalDue;

      if (dateFilter === 'all') {
        const netFromTx = txDueSum - txPaymentSum;
        if (cust.totalDue > netFromTx) {
          totalDue += (cust.totalDue - netFromTx);
        } else if (cust.totalDue < netFromTx) {
          totalPayment += (netFromTx - cust.totalDue);
        }
        currentBalance = cust.totalDue;
      } else {
        currentBalance = Math.max(0, totalDue - totalPayment);
      }

      const d = new Date(cust.createdAt || Date.now());
      const dateFormatted = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

      return {
        id: cust.id,
        serialNumber: cust.serialNumber || idx + 1,
        name: cust.name,
        phone: cust.phone || '',
        address: cust.address || '',
        dateRaw: cust.createdAt || new Date().toISOString(),
        dateFormatted,
        totalDue,
        totalPayment,
        currentBalance,
        status: currentBalance > 0 ? ('due' as const) : ('cleared' as const)
      };
    }).sort((a, b) => {
      // Sort accounts with dues first, then by serial number
      if (b.currentBalance !== a.currentBalance) {
        return b.currentBalance - a.currentBalance;
      }
      return (a.serialNumber || 0) - (b.serialNumber || 0);
    });
  }, [customers, allTransactions, selectedCustomerId, dateFilter]);

  // Filter and format transaction records for detailed Statement table
  const statementRows = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    // Filter transactions
    let txList = [...allTransactions];
    if (selectedCustomerId !== 'all') {
      txList = txList.filter((tx) => tx.customerId === selectedCustomerId);
    }

    // Apply date filter
    if (dateFilter === 'today') {
      txList = txList.filter((tx) => {
        const tTime = new Date(tx.createdAt || tx.date).getTime();
        return tTime >= startOfToday;
      });
    } else if (dateFilter === 'last7') {
      txList = txList.filter((tx) => {
        const tTime = new Date(tx.createdAt || tx.date).getTime();
        return tTime >= sevenDaysAgo;
      });
    } else if (dateFilter === 'thisMonth') {
      txList = txList.filter((tx) => {
        const tTime = new Date(tx.createdAt || tx.date).getTime();
        return tTime >= startOfMonth;
      });
    }

    const rows: {
      id: string;
      dateRaw: string;
      dateFormatted: string;
      customerName: string;
      customerPhone?: string;
      description: string;
      dueAmount: number;
      paymentAmount: number;
    }[] = [];

    // Map all recorded transactions
    txList.forEach((tx) => {
      const cust = customerMap.get(tx.customerId);
      const custName = cust ? cust.name : 'কাস্টমার';
      const isDue = tx.type === 'due';
      const isPayment = tx.type === 'payment';
      const isAdjustment = tx.type === 'adjustment';

      let dueAmount = 0;
      let paymentAmount = 0;

      if (isDue) {
        dueAmount = tx.amount;
      } else if (isPayment) {
        paymentAmount = tx.amount;
      } else if (isAdjustment) {
        if (tx.newBalance > tx.previousBalance) {
          dueAmount = tx.newBalance - tx.previousBalance;
        } else {
          paymentAmount = tx.previousBalance - tx.newBalance;
        }
      }

      const rawDate = tx.createdAt || tx.date;
      const d = new Date(rawDate);
      const dateFormatted = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
          d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : rawDate;

      rows.push({
        id: tx.id,
        dateRaw: rawDate,
        dateFormatted,
        customerName: custName,
        customerPhone: cust?.phone,
        description: tx.description || (isDue ? 'ঔষধ বাকী' : isPayment ? 'নগদ জমা / পেমেন্ট' : 'ব্যালেন্স সমন্বয়'),
        dueAmount,
        paymentAmount
      });
    });

    // Opening balances for customers without transaction records
    if (selectedCustomerId === 'all') {
      const customerIdsWithTx = new Set(txList.map((tx) => tx.customerId));
      customers.forEach((c) => {
        if (c.totalDue > 0 && !customerIdsWithTx.has(c.id)) {
          const d = new Date(c.createdAt || Date.now());
          const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
            d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

          rows.push({
            id: `init_${c.id}`,
            dateRaw: c.createdAt || new Date().toISOString(),
            dateFormatted,
            customerName: c.name,
            customerPhone: c.phone,
            description: c.notes || 'পূর্বের বাকী হিসাব (Opening Balance)',
            dueAmount: c.totalDue,
            paymentAmount: 0
          });
        }
      });
    } else if (selectedCustomerObj && rows.length === 0 && selectedCustomerObj.totalDue > 0) {
      const d = new Date(selectedCustomerObj.createdAt || Date.now());
      const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      rows.push({
        id: `init_${selectedCustomerObj.id}`,
        dateRaw: selectedCustomerObj.createdAt || new Date().toISOString(),
        dateFormatted,
        customerName: selectedCustomerObj.name,
        customerPhone: selectedCustomerObj.phone,
        description: selectedCustomerObj.notes || 'পূর্বের বাকী হিসাব (Opening Balance)',
        dueAmount: selectedCustomerObj.totalDue,
        paymentAmount: 0
      });
    }

    rows.sort((a, b) => new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime());
    return rows;
  }, [allTransactions, selectedCustomerId, dateFilter, customerMap, selectedCustomerObj, customers]);

  // Overall Grand Totals (All Accounts Combined)
  const grandTotalDue = useMemo(() => {
    if (reportLayout === 'summary') {
      return customerSummaryRows.reduce((acc, r) => acc + (r.totalDue || 0), 0);
    }
    return statementRows.reduce((acc, r) => acc + (r.dueAmount || 0), 0);
  }, [reportLayout, customerSummaryRows, statementRows]);

  const grandTotalPayment = useMemo(() => {
    if (reportLayout === 'summary') {
      return customerSummaryRows.reduce((acc, r) => acc + (r.totalPayment || 0), 0);
    }
    return statementRows.reduce((acc, r) => acc + (r.paymentAmount || 0), 0);
  }, [reportLayout, customerSummaryRows, statementRows]);

  const grandCurrentBalance = useMemo(() => {
    if (reportLayout === 'summary') {
      return customerSummaryRows.reduce((acc, r) => acc + (r.currentBalance || 0), 0);
    }
    if (selectedCustomerObj) {
      return selectedCustomerObj.totalDue;
    }
    return Math.max(0, grandTotalDue - grandTotalPayment);
  }, [reportLayout, customerSummaryRows, selectedCustomerObj, grandTotalDue, grandTotalPayment]);

  // Date range label
  const dateRangeLabel = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
    if (dateFilter === 'today') return `আজকের হিসাব: ${todayStr}`;
    if (dateFilter === 'last7') return `গত ৭ দিনের হিসাব`;
    if (dateFilter === 'thisMonth') return `চলতি মাসের হিসাব (${new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })})`;
    return `সব সময় / সামগ্রিক হিসাব`;
  }, [dateFilter]);

  // Current generation date & time strings
  const now = new Date();
  const currentDateFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const currentTimeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  // 1. Download PDF using html2canvas-pro and jsPDF with unclipped offscreen clone & intelligent row-aware multi-page slicing
  const handleDownloadPDF = async () => {
    if (!statementRef.current) return;
    setIsExportingPDF(true);
    setDownloadSuccess(false);

    const sourceElement = statementRef.current;

    // Create an offscreen clone of the statement to guarantee that 100% of rows
    // are rendered without being constrained, clipped, or truncated by modal height or scrollbars
    const clone = sourceElement.cloneNode(true) as HTMLElement;
    clone.id = 'printable-statement-pdf-clone';
    clone.style.position = 'absolute';
    clone.style.left = '-99999px';
    clone.style.top = '0';
    clone.style.width = '794px';
    clone.style.maxWidth = '794px';
    clone.style.minWidth = '794px';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';
    clone.style.padding = '24px 28px';
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#111827';
    clone.style.zIndex = '-9999';

    // Remove any overflow or max-height constraints from all nested containers in the clone
    clone.querySelectorAll('*').forEach((node) => {
      const el = node as HTMLElement;
      if (el.style) {
        el.style.maxHeight = 'none';
        if (
          el.style.overflow === 'auto' ||
          el.style.overflow === 'scroll' ||
          el.style.overflowY === 'auto' ||
          el.style.overflowX === 'auto'
        ) {
          el.style.overflow = 'visible';
        }
      }
    });

    document.body.appendChild(clone);

    try {
      // Allow browser layout and font reflow to complete
      await new Promise((r) => setTimeout(r, 100));

      const reportTitlePrefix = reportLayout === 'summary' 
        ? 'Siam_Pharma_Customer_Accounts_Summary_Report' 
        : 'Siam_Pharma_Master_Ledger_Statement';
      const customerSuffix = selectedCustomerObj 
        ? `_${selectedCustomerObj.name.replace(/[^a-zA-Z0-9]/g, '_')}`
        : '_All_Accounts_Combined';
      const dateSuffix = new Date().toISOString().split('T')[0];
      const filename = `${reportTitlePrefix}${customerSuffix}_${dateSuffix}.pdf`;

      const fullScrollHeight = Math.max(clone.scrollHeight, clone.offsetHeight);
      const fullWidth = 794;

      // Extract accurate element row boundaries from the unclipped clone
      const cloneRect = clone.getBoundingClientRect();
      const breakElements = Array.from(
        clone.querySelectorAll<HTMLElement>(
          'tr, .avoid-break, .statement-header, .statement-totals, .statement-summary, .statement-footer'
        )
      );

      const boundaries = breakElements
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            top: rect.top - cloneRect.top,
            bottom: rect.bottom - cloneRect.top,
            height: rect.height
          };
        })
        .filter((b) => b.height > 0)
        .sort((a, b) => a.top - b.top);

      // Render the complete element canvas using html2canvas-pro with exact full height
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: fullWidth,
        height: fullScrollHeight,
        windowWidth: fullWidth,
        windowHeight: fullScrollHeight + 500,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0
      });

      // Initialize jsPDF document (A4 portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const marginX = 8; // 8mm left and right margin
      const marginTop = 8; // 8mm top margin
      const marginBottom = 12; // 12mm bottom margin to make space for page footer
      const contentWidth = pageWidth - (marginX * 2); // 194mm usable width
      const maxPageContentHeight = pageHeight - marginTop - marginBottom; // 277mm usable height

      // Check if total content fits comfortably on 1 page
      const totalPdfHeight = (canvas.height * contentWidth) / canvas.width;

      if (totalPdfHeight <= maxPageContentHeight) {
        // Single page document
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', marginX, marginTop, contentWidth, totalPdfHeight);
      } else {
        // Multi-page document with dynamic row-aware page splitting
        // Maximum DOM height that fits on a single A4 page
        const domPageHeight = (maxPageContentHeight / contentWidth) * fullWidth;
        const scale = canvas.width / fullWidth;

        let currentDomTop = 0;
        let pageIndex = 0;

        while (currentDomTop < fullScrollHeight - 5) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          let targetDomBottom = currentDomTop + domPageHeight;

          if (targetDomBottom >= fullScrollHeight) {
            targetDomBottom = fullScrollHeight;
          } else {
            // Find any row that straddles the page break line
            const straddling = boundaries.find(
              (b) => b.top < targetDomBottom && b.bottom > targetDomBottom
            );

            // If a row straddles, break cleanly right before it (ensuring at least 120px progress)
            if (straddling && straddling.top > currentDomTop + 120) {
              targetDomBottom = straddling.top;
            }
          }

          // Safety guarantee: Ensure forward progress on every iteration
          if (targetDomBottom <= currentDomTop + 40) {
            targetDomBottom = Math.min(currentDomTop + domPageHeight, fullScrollHeight);
          }

          const sliceDomHeight = targetDomBottom - currentDomTop;
          const sliceCanvasTop = Math.round(currentDomTop * scale);
          const sliceCanvasHeight = Math.min(
            Math.round(sliceDomHeight * scale),
            canvas.height - sliceCanvasTop
          );

          if (sliceCanvasHeight > 0) {
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceCanvasHeight;
            const ctx = sliceCanvas.getContext('2d');

            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
              ctx.drawImage(
                canvas,
                0, sliceCanvasTop, canvas.width, sliceCanvasHeight,
                0, 0, canvas.width, sliceCanvasHeight
              );

              const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.98);
              const slicePdfHeight = (sliceCanvasHeight * contentWidth) / canvas.width;
              pdf.addImage(sliceImgData, 'JPEG', marginX, marginTop, contentWidth, slicePdfHeight);
            }
          }

          currentDomTop = targetDomBottom;
          pageIndex++;
        }
      }

      // Add page numbers and footer to every generated page
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139); // slate-500
        const footerText = `${pharmacyProfile.storeName || 'Siam Pharma Due Management'} • তারিখ: ${currentDateFormatted} • পৃষ্ঠা ${p} / ${totalPages} (Page ${p} of ${totalPages})`;
        pdf.text(footerText, pageWidth / 2, pageHeight - 5, { align: 'center' });
      }

      pdf.save(filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('PDF generation error, falling back to print dialog:', err);
      handlePrintDirect();
    } finally {
      // Ensure clone is cleaned up from DOM
      if (clone && clone.parentNode) {
        document.body.removeChild(clone);
      }
      setIsExportingPDF(false);
    }
  };

  // 2. Direct Print using dedicated isolated iframe with complete print stylesheet
  const handlePrintDirect = () => {
    const element = statementRef.current;
    if (!element) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Siam Pharma Account Statement</title>
          <meta charset="utf-8" />
          <style>
            @page { 
              size: A4 portrait; 
              margin: 10mm 8mm 10mm 8mm; 
            }
            body { 
              margin: 0; 
              padding: 0; 
              background: #ffffff; 
              color: #111827; 
              font-family: "Hind Siliguri", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * { box-sizing: border-box; }
            #printable-statement {
              width: 100% !important;
              max-width: 794px !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            table { 
              width: 100% !important; 
              border-collapse: collapse !important; 
              page-break-inside: auto !important;
              break-inside: auto !important;
            }
            thead { 
              display: table-header-group !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            tfoot { 
              display: table-footer-group !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            tr { 
              page-break-inside: avoid !important; 
              break-inside: avoid !important;
              page-break-after: auto !important; 
              break-after: auto !important;
            }
            tbody tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            th, td { 
              border-bottom: 1px solid #e5e7eb !important; 
              padding: 6px 8px !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
            }
            .statement-header,
            .statement-totals,
            .statement-summary,
            .statement-footer,
            .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            img, svg {
              max-width: 100% !important;
              height: auto !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .statement-logo {
              max-width: 48px !important;
              max-height: 48px !important;
              object-fit: contain !important;
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Iframe print failed:', e);
        window.print();
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }
    }, 400);
  };

  // 3. Export CSV with Bangla UTF-8 BOM
  const exportCSV = () => {
    if (reportLayout === 'summary') {
      const headers = [
        'ক্রমিক (SL)',
        'তারিখ (Date)',
        'কাস্টমারের নাম (Customer Name)',
        'মোবাইল (Phone)',
        'মোট বাকী (-) (Total Due)',
        'মোট পেমেন্ট (+) (Total Paid)',
        'নিট বকেয়া / বাদ বাকী (Current Balance)'
      ];
      const rows = customerSummaryRows.map((r) => [
        `"#${r.serialNumber}"`,
        `"${r.dateFormatted}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.phone}"`,
        r.totalDue || 0,
        r.totalPayment || 0,
        r.currentBalance || 0
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Siam_Pharma_Customer_Accounts_Summary_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Date', 'Customer Name', 'Description', 'Due (-)', 'Payment (+)'];
      const rows = statementRows.map((r) => [
        `"${r.dateFormatted}"`,
        `"${r.customerName.replace(/"/g, '""')}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        r.dueAmount || 0,
        r.paymentAmount || 0
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Siam_Pharma_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 4. Export JSON Backup
  const exportJSON = () => {
    const backupData = {
      pharmacy: pharmacyProfile.storeName || 'Siam Pharma Due Management',
      phone: pharmacyProfile.contactPhone || '01846793071',
      exportDate: new Date().toISOString(),
      stats,
      customers,
      allTransactions
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Siam_Pharma_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-3xl bg-[#051c14] border border-[rgba(255,255,255,0.15)] shadow-2xl shadow-emerald-950/80 overflow-hidden box-border">
        
        {/* Modal Header */}
        <div className="no-print flex items-center justify-between p-4 sm:p-5 border-b border-[rgba(255,255,255,0.15)] bg-gradient-to-r from-[#072a1e] via-[#052117] to-[#03150e]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                একাউন্ট বিবৃতি ও PDF রিপোর্ট (Account Statement)
              </h3>
            </div>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              কাস্টমার লেনদেন ও বাকির খাতার পূর্ণাঙ্গ প্রিন্ট ও PDF স্টেটমেন্ট জেনারেটর
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-emerald-950/80 text-slate-300 hover:text-white hover:bg-emerald-900 border border-[rgba(255,255,255,0.15)] transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="no-print p-3.5 sm:p-4 bg-[#041a12] border-b border-[rgba(255,255,255,0.12)] flex flex-wrap items-center justify-between gap-3">
          {/* Left: Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-[280px]">
            {/* View Mode Toggle: Summary per customer vs Detailed Transactions */}
            <div className="flex items-center bg-[#072419] p-0.5 rounded-xl border border-[rgba(255,255,255,0.15)]">
              <button
                type="button"
                onClick={() => setReportLayout('summary')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  reportLayout === 'summary'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-emerald-300/80 hover:text-white'
                }`}
                title="কাস্টমার অনুযায়ী একক সারির সারাংশ রিপোর্ট (Single Row per Account)"
              >
                কাস্টমার সারাংশ (১ সারি)
              </button>
              <button
                type="button"
                onClick={() => setReportLayout('detailed')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  reportLayout === 'detailed'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-emerald-300/80 hover:text-white'
                }`}
                title="বিস্তারিত সকল লেনদেন তালিকা"
              >
                বিস্তারিত লেনদেন
              </button>
            </div>

            {/* Customer Selector */}
            <div className="flex items-center gap-1.5 bg-[#072419] px-3 py-1.5 rounded-xl border border-[rgba(255,255,255,0.15)]">
              <User className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-emerald-200 focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[190px] truncate"
              >
                <option value="all" className="bg-[#051c14] text-white">সকল কাস্টমার / অল একাউন্ট (All Accounts Combined)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#051c14] text-white">
                    #{c.serialNumber} {c.name} {c.totalDue > 0 ? `(৳${c.totalDue})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2 bg-[#06241a] px-3.5 py-2 rounded-xl border border-emerald-500/40 shadow-sm">
              <Calendar className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)] flex-shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#051c14] text-white">সব সময় / All Dates</option>
                <option value="today" className="bg-[#051c14] text-white">আজকে / Today</option>
                <option value="last7" className="bg-[#051c14] text-white">গত ৭ দিন / Last 7 Days</option>
                <option value="thisMonth" className="bg-[#051c14] text-white">চলতি মাস / This Month</option>
              </select>
            </div>
          </div>

          {/* Right: Export Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all active:scale-95 disabled:opacity-50"
              title="Download PDF Document"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>PDF তৈরি হচ্ছে...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
                  <span>PDF সেভ হয়েছে!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>পিডিএফ ডাউনলোড (PDF)</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrintDirect}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#072b1e] hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all active:scale-95"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>

            {/* CSV / Excel Button */}
            <button
              onClick={exportCSV}
              className="p-2 rounded-xl bg-[#072b1e] hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs transition-all active:scale-95"
              title="Export CSV / Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>

            {/* JSON Backup Button */}
            <button
              onClick={exportJSON}
              className="p-2 rounded-xl bg-[#072b1e] hover:bg-teal-900/80 border border-teal-500/40 text-teal-300 text-xs transition-all active:scale-95"
              title="Full JSON Backup"
            >
              <FileJson className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Statement Preview Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#03130c]/70 flex justify-center">
          
          {/* THE STATEMENT SHEET - Exactly styled for standard A4 portrait width */}
          <div 
            ref={statementRef}
            id="printable-statement"
            className="printable-container w-full max-w-[794px] rounded-xl p-5 sm:p-7 box-border"
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #d1d5db',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              fontFamily: '"Hind Siliguri", system-ui, -apple-system, sans-serif'
            }}
          >
            {/* 1. PDF Document Header Layout */}
            <div 
              className="statement-header avoid-break"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: '14px',
                borderBottom: '2px solid #e5e7eb',
                marginBottom: '16px',
                width: '100%',
                boxSizing: 'border-box',
                pageBreakInside: 'avoid',
                breakInside: 'avoid'
              }}
            >
              {/* Top-Left: Store Name, Phone Number, Generation Date/Time */}
              <div style={{ textAlign: 'left', minWidth: '170px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#064e3b', margin: 0, lineHeight: '1.2' }}>
                  {pharmacyProfile.storeName || 'Siam Pharma'}
                </h2>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '4px 0 0 0' }}>
                  ফোন: {pharmacyProfile.contactPhone || '01846793071'}
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '3px 0 0 0' }}>
                  তারিখ: {currentDateFormatted}, সময়: {currentTimeFormatted}
                </p>
              </div>

              {/* Title Center: একাউন্ট বিবৃতি with All Accounts subtitle and date range */}
              <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
                  একাউন্ট বিবৃতি
                </h1>
                <p style={{ fontSize: '13px', color: '#047857', margin: '3px 0 0 0', fontWeight: '700' }}>
                  {selectedCustomerId === 'all' 
                    ? 'সকল একাউন্ট সামগ্রিক বিবরণী (All Accounts Statement)'
                    : `গ্রাহক: ${selectedCustomerObj?.name} (${selectedCustomerObj?.phone})`
                  }
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '3px 0 0 0', fontWeight: '500' }}>
                  হিসাবের পরিসীমা: ({dateRangeLabel})
                </p>
              </div>

              {/* Top-Right: App Logo / Bakir Khata logo badge */}
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '150px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#047857', lineHeight: 1.1 }}>
                      বাকির খাতা
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#6b7280' }}>
                      Siam Pharma
                    </div>
                  </div>
                  {/* Clean SVG Emblem Badge with constrained scaling */}
                  <div 
                    className="statement-logo"
                    style={{
                      width: '46px',
                      height: '46px',
                      maxWidth: '46px',
                      maxHeight: '46px',
                      borderRadius: '12px',
                      border: '2px solid #10b981',
                      background: '#042014',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    <img 
                      src={pharmacyProfile.logoUrl || "/icons/icon-192x192.png"} 
                      alt="Siam Pharma Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Overall Summary Totals (All Accounts Combined) */}
            <div 
              className="statement-totals avoid-break"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '18px',
                backgroundColor: '#f9fafb',
                width: '100%',
                boxSizing: 'border-box',
                pageBreakInside: 'avoid',
                breakInside: 'avoid'
              }}
            >
              {/* Box 1: মোট বাকী (-) in RED text */}
              <div style={{
                padding: '10px 12px',
                textAlign: 'center',
                borderRight: '1px solid #d1d5db'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#dc2626', marginBottom: '3px' }}>
                  মোট বাকী (-)
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#dc2626' }}>
                  ৳ {grandTotalDue.toLocaleString('en-US')}
                </div>
                <div style={{ fontSize: '10px', color: '#dc2626', opacity: 0.85, marginTop: '2px' }}>
                  {selectedCustomerId === 'all' ? 'সকল একাউন্টের মোট বাকি' : 'মোট বকেয়া পাওনা'}
                </div>
              </div>

              {/* Box 2: মোট পেমেন্ট (+) in GREEN text */}
              <div style={{
                padding: '10px 12px',
                textAlign: 'center',
                borderRight: '1px solid #d1d5db'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#16a34a', marginBottom: '3px' }}>
                  মোট পেমেন্ট (+)
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>
                  ৳ {grandTotalPayment.toLocaleString('en-US')}
                </div>
                <div style={{ fontSize: '10px', color: '#16a34a', opacity: 0.85, marginTop: '2px' }}>
                  {selectedCustomerId === 'all' ? 'মোট আদায়কৃত নগদ জমা' : 'মোট পরিশোধিত জমা'}
                </div>
              </div>

              {/* Box 3: বাদ বাকী / নিট ব্যালেন্স in GRAY/DARK text with balance */}
              <div style={{
                padding: '10px 12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#374151', marginBottom: '3px' }}>
                  বাদ বাকী / নিট ব্যালেন্স
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#111827' }}>
                  ৳ {grandCurrentBalance.toLocaleString('en-US')}
                </div>
                <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>
                  {selectedCustomerId === 'all' ? 'সর্বমোট অবশিষ্ট পাওনা' : 'বর্তমান অবশিষ্ট বাকি'}
                </div>
              </div>
            </div>

            {/* 3. Consolidated Customer Accounts Summary Table (Single Row per Account) */}
            {reportLayout === 'summary' ? (
              <div style={{ width: '100%', overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  textAlign: 'left',
                  pageBreakInside: 'auto',
                  breakInside: 'auto'
                }}>
                  {/* Header Row: 5 Columns with table-header-group for repeating headers */}
                  <thead style={{ display: 'table-header-group', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <tr style={{
                      backgroundColor: '#e5e7eb',
                      color: '#1f2937',
                      borderBottom: '2px solid #cbd5e1'
                    }}>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '22%' }}>ক্রমিক / তারিখ (SL / Date)</th>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '28%' }}>কাস্টমারের নাম (Customer Name)</th>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '16%', textAlign: 'right' }}>মোট বাকী (-)</th>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '16%', textAlign: 'right' }}>মোট পেমেন্ট (+)</th>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '18%', textAlign: 'right' }}>নিট বকেয়া / বাদ বাকী</th>
                    </tr>
                  </thead>

                  {/* Data Rows: Single row per customer account with page-break-inside avoid */}
                  <tbody>
                    {customerSummaryRows.length > 0 ? (
                      customerSummaryRows.map((custRow, idx) => (
                        <tr 
                          key={custRow.id || idx}
                          className="avoid-break"
                          style={{
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #e5e7eb',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid'
                          }}
                        >
                          {/* 1. SL / Date */}
                          <td style={{ padding: '8px 10px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: '700', color: '#111827' }}>#{custRow.serialNumber}</div>
                            <div style={{ fontSize: '10px', color: '#6b7280' }}>{custRow.dateFormatted}</div>
                          </td>

                          {/* 2. Customer Name */}
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: '700', color: '#111827' }}>{custRow.name}</div>
                            {custRow.phone && (
                              <div style={{ fontSize: '10px', color: '#4b5563' }}>মোবাইল: {custRow.phone}</div>
                            )}
                          </td>

                          {/* 3. Total Due (-) */}
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                            {custRow.totalDue > 0 ? `৳ ${custRow.totalDue.toLocaleString('en-US')}` : '-'}
                          </td>

                          {/* 4. Total Paid (+) */}
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                            {custRow.totalPayment > 0 ? `৳ ${custRow.totalPayment.toLocaleString('en-US')}` : '-'}
                          </td>

                          {/* 5. Current Balance / Net Due */}
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800' }}>
                            <span style={{ 
                              color: custRow.currentBalance > 0 ? '#dc2626' : '#16a34a',
                              backgroundColor: custRow.currentBalance > 0 ? '#fef2f2' : '#f0fdf4',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              ৳ {custRow.currentBalance.toLocaleString('en-US')}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                          উক্ত ফিল্টারের মধ্যে কোনো কাস্টমার একাউন্ট পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Table Footer: Total Row */}
                  <tfoot style={{ display: 'table-footer-group', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <tr style={{
                      backgroundColor: '#f3f4f6',
                      borderTop: '2px solid #9ca3af',
                      fontWeight: '800',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}>
                      <td colSpan={2} style={{ padding: '10px 10px', color: '#111827' }}>
                        সর্বমোট (Total: {customerSummaryRows.length} টি একাউন্ট)
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#dc2626', fontWeight: '800' }}>
                        ৳ {grandTotalDue.toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#16a34a', fontWeight: '800' }}>
                        ৳ {grandTotalPayment.toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: grandCurrentBalance > 0 ? '#dc2626' : '#16a34a', fontWeight: '900' }}>
                        ৳ {grandCurrentBalance.toLocaleString('en-US')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* Detailed Transactions Table */
              <div style={{ width: '100%', overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  textAlign: 'left',
                  pageBreakInside: 'auto',
                  breakInside: 'auto'
                }}>
                  <thead style={{ display: 'table-header-group', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <tr style={{
                      backgroundColor: '#e5e7eb',
                      color: '#1f2937',
                      borderBottom: '2px solid #cbd5e1'
                    }}>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '22%' }}>Date</th>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '24%' }}>নাম</th>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '24%' }}>বিবরণ</th>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '15%', textAlign: 'right' }}>বাকী (-)</th>
                      <th style={{ padding: '9px 10px', fontWeight: '700', width: '15%', textAlign: 'right' }}>পেমেন্ট (+)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementRows.length > 0 ? (
                      statementRows.map((row, idx) => (
                        <tr 
                          key={row.id || idx}
                          className="avoid-break"
                          style={{
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #e5e7eb',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid'
                          }}
                        >
                          <td style={{ padding: '8px 10px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                            {row.dateFormatted}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: '600', color: '#111827' }}>
                            {row.customerName}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#4b5563' }}>
                            {row.description || '-'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                            {row.dueAmount > 0 ? `৳ ${row.dueAmount.toLocaleString('en-US')}` : '-'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                            {row.paymentAmount > 0 ? `৳ ${row.paymentAmount.toLocaleString('en-US')}` : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                          উক্ত তারিখের মধ্যে কোনো লেনদেন পাওয়া যায়নি। (সব সময় নির্বাচন করুন)
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot style={{ display: 'table-footer-group', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <tr style={{
                      backgroundColor: '#f3f4f6',
                      borderTop: '2px solid #9ca3af',
                      fontWeight: '800',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}>
                      <td colSpan={3} style={{ padding: '10px 10px', color: '#111827' }}>
                        সর্বমোট (Total)
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#dc2626', fontWeight: '800' }}>
                        ৳ {grandTotalDue.toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#16a34a', fontWeight: '800' }}>
                        ৳ {grandTotalPayment.toLocaleString('en-US')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Master Summary Bottom Banner */}
            <div 
              className="statement-summary avoid-break"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 14px',
                marginBottom: '14px',
                fontSize: '12px',
                fontWeight: '700',
                boxSizing: 'border-box',
                pageBreakInside: 'avoid',
                breakInside: 'avoid'
              }}
            >
              <span style={{ color: '#374151' }}>
                {reportLayout === 'summary'
                  ? `মোট কাস্টমার একাউন্ট: ${customerSummaryRows.length} টি (${customers.filter(c => c.totalDue > 0).length} জনের বাকী রয়েছে)`
                  : (selectedCustomerId === 'all' 
                      ? `মোট কাস্টমার একাউন্ট: ${customers.length} টি • মোট হিসাব এন্ট্রি: ${statementRows.length} টি`
                      : `হিসাব এন্ট্রি সংখ্যা: ${statementRows.length} টি`)
                }
              </span>
              <span style={{ color: '#111827', fontSize: '13px' }}>
                বাদ বাকী / নিট ব্যালেন্স:{' '}
                <span style={{ color: grandCurrentBalance > 0 ? '#dc2626' : '#16a34a', fontWeight: '900' }}>
                  ৳ {grandCurrentBalance.toLocaleString('en-US')}
                </span>
              </span>
            </div>

            {/* Document Bottom Footer */}
            <div 
              className="statement-footer avoid-break"
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10px',
                color: '#6b7280',
                pageBreakInside: 'avoid',
                breakInside: 'avoid'
              }}
            >
              <span>* এটি একটি কম্পিউটার প্রস্তুতকৃত একাউন্ট বিবৃতি (Siam Pharma Due Management System)</span>
              <span>হেল্পলাইন: {pharmacyProfile.contactPhone || '01846793071'}</span>
            </div>

          </div>
        </div>

        {/* Modal Bottom Close Row */}
        <div className="no-print p-3 sm:p-4 border-t border-[rgba(255,255,255,0.15)] bg-[#041a12] flex items-center justify-between">
          <p className="text-xs text-emerald-400/80 hidden sm:block">
            মোট একাউন্ট: {customerSummaryRows.length} টি • অবশিষ্ট মোট বকেয়া: ৳{grandCurrentBalance.toLocaleString('en-US')}
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-950/80 text-xs font-semibold text-slate-300 hover:text-white border border-[rgba(255,255,255,0.15)] transition-all"
            >
              বন্ধ করুন (Close)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
