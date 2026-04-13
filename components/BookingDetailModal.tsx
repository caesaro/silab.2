import React from "react";
import { BookingStatus, Room } from "../types";
import {
  X,
  User,
  Shield,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Wrench,
  Edit,
  Save,
  FileText,
  Download,
  Printer,
  AlertTriangle,
  Trash2,
  XCircle,
  CheckCircle,
  Loader2,
  Timer,
} from "lucide-react";
import nocLogo from "../src/assets/noc.png";
import { formatDateID } from "../src/utils/formatters";
import QRCode from "react-qr-code";

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers  (defined outside the component to avoid re-creation on render)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the human-readable duration between two "HH:mm" strings.
 * Returns "—" when the range is invalid or zero.
 */
const computeDuration = (start?: string, end?: string): string => {
  if (!start || !end) return "—";
  const [sh, sm] = start.slice(0, 5).split(":").map(Number);
  const [eh, em] = end.slice(0, 5).split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}j ${m}m`;
  return h > 0 ? `${h}j` : `${m}m`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Micro-components
// ─────────────────────────────────────────────────────────────────────────────

/** Pill badge that reflects booking status colour. */
const StatusBadge: React.FC<{ status: string; size?: "sm" | "md" }> = ({
  status,
  size = "md",
}) => {
  const colour =
    status === BookingStatus.APPROVED
      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
      : status === BookingStatus.REJECTED
        ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
        : "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";

  const padding =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${colour} ${padding}`}
    >
      {status}
    </span>
  );
};

/** Tiny uppercase section heading with an inline icon. */
const SectionLabel: React.FC<{ icon: React.ReactNode; label: string }> = ({
  icon,
  label,
}) => (
  <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
    {icon}
    {label}
  </h4>
);

/** A labelled info row: icon | label + value stacked vertically. */
const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>
    <div>
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="text-sm text-gray-800 dark:text-gray-200">{value || "—"}</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const BookingDetailModal = ({
  isOpen,
  selectedBooking,
  setSelectedBooking,
  rooms,
  staffList,
  isEditingTech,
  setIsEditingTech,
  editTechData,
  setEditTechData,
  handleSaveTechData,
  handleViewFile,
  handlePrintProof,
  handleRejectClick,
  handleDeleteClick,
  handleApproveClick,
  processingId,
  ticketRef,
  // NEW — array of all BookingWithTech entries that belong to the same
  // request letter (same userId + purpose + proposalFile hash).
  // Falls back to [selectedBooking] when not provided for backward compat.
  bookingGroup,
}: any) => {
  if (!isOpen || !selectedBooking) return null;

  const getRoomName = (roomId: string): string =>
    rooms.find((r: Room) => r.id === roomId)?.name ?? "Ruangan Tidak Diketahui";

  // ── Derive the group that feeds the middle "Daftar Ruangan" section ────────
  const group: any[] =
    Array.isArray(bookingGroup) && bookingGroup.length > 0
      ? bookingGroup
      : [selectedBooking];

  const totalRooms = group.length;
  const totalSchedules = group.reduce(
    (s: number, b: any) => s + (b.schedules?.length ?? 1),
    0,
  );

  // ── Helpers for the hidden ticket (image export) ──────────────────────────
  const ticketRoomName = getRoomName(selectedBooking.roomId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-fade-in-up flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* ══════════════════════════════════════════════════════════════════
            MODAL HEADER
            Shows title, room/schedule summary chip, status badge, close.
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Left cluster */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight text-gray-900 dark:text-white">
                Detail Peminjaman
              </h3>
              {/* Compact stat pills */}
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <MapPin className="h-2.5 w-2.5" />
                  {totalRooms} Ruangan
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  <Calendar className="h-2.5 w-2.5" />
                  {totalSchedules} Jadwal
                </span>
              </div>
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <StatusBadge status={selectedBooking.status} />
            <button
              onClick={() => setSelectedBooking(null)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SCROLLABLE BODY
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto">
          {/* ────────────────────────────────────────────────────────────────
              TOP SECTION — 2-column grid
              Left  → INFORMASI PEMINJAM
              Right → DETAIL KEGIATAN + Technical Support
          ──────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* ── Left: Informasi Peminjam ── */}
            <div className="space-y-5 p-6">
              <SectionLabel
                icon={<User className="h-3.5 w-3.5" />}
                label="Informasi Peminjam"
              />

              {/* Avatar + name + ID */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 font-bold text-sm text-white shadow-sm">
                  {selectedBooking.userName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedBooking.userName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedBooking.userId}
                  </p>
                </div>
              </div>

              {/* PIC */}
              <InfoRow
                icon={<Shield className="h-4 w-4" />}
                label="Penanggung Jawab"
                value={selectedBooking.responsiblePerson}
              />

              {/* Phone */}
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Kontak / WA"
                value={selectedBooking.contactPerson}
              />
            </div>

            {/* ── Right: Detail Kegiatan + Technical Support ── */}
            <div className="space-y-5 p-6">
              <SectionLabel
                icon={<FileText className="h-3.5 w-3.5" />}
                label="Detail Kegiatan"
              />

              {/* Nama Kegiatan */}
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Nama Kegiatan
                </p>
                <p className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-100">
                  {selectedBooking.purpose}
                </p>
              </div>

              {/* Rejection reason — only when status is REJECTED */}
              {selectedBooking.status === BookingStatus.REJECTED &&
                selectedBooking.rejectionReason && (
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-500 dark:text-red-400">
                      Alasan Penolakan
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {selectedBooking.rejectionReason}
                    </p>
                  </div>
                )}

              {/* Technical Support — only for APPROVED / REJECTED */}
              {(selectedBooking.status === BookingStatus.APPROVED ||
                selectedBooking.status === BookingStatus.REJECTED) && (
                <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                  {/* Sub-heading row with edit / save controls */}
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      <Wrench className="h-3.5 w-3.5" />
                      Technical Support
                    </p>

                    {!isEditingTech ? (
                      <button
                        onClick={() => setIsEditingTech(true)}
                        className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setIsEditingTech(false)}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveTechData}
                          className="flex items-center gap-0.5 text-xs font-bold text-green-600 hover:text-green-700 dark:text-green-400"
                        >
                          <Save className="h-3 w-3" /> Simpan
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Editing mode */}
                  {isEditingTech ? (
                    <div className="space-y-2">
                      {/* PIC chips */}
                      <div>
                        {editTechData.pic.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {editTechData.pic.map((picId: string) => {
                              const staff = staffList.find(
                                (s: any) => s.id === picId,
                              );
                              return (
                                <span
                                  key={picId}
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 pl-2 pr-1 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                  {staff?.name}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditTechData((prev: any) => ({
                                        ...prev,
                                        pic: prev.pic.filter(
                                          (id: string) => id !== picId,
                                        ),
                                      }))
                                    }
                                    className="rounded-full p-0.5 hover:text-blue-600"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value)
                              setEditTechData((prev: any) => ({
                                ...prev,
                                pic: [...prev.pic, e.target.value],
                              }));
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                        >
                          <option value="">+ Tambah PIC</option>
                          {staffList
                            .filter(
                              (s: any) => !editTechData.pic.includes(s.id),
                            )
                            .map((staff: any) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name} ({staff.jabatan})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Needs textarea */}
                      <textarea
                        value={editTechData.needs}
                        onChange={(e) =>
                          setEditTechData({
                            ...editTechData,
                            needs: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="Kebutuhan alat (mis: 2 Mic Wireless, HDMI)"
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  ) : (
                    /* View mode */
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="w-16 shrink-0 pt-0.5 text-xs text-gray-400">
                          PIC
                        </span>
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                          {selectedBooking.techSupportPicName || "—"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-16 shrink-0 pt-0.5 text-xs text-gray-400">
                          Alat
                        </span>
                        <span className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                          {selectedBooking.techSupportNeeds || "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────
              MIDDLE SECTION — Daftar Ruangan & Jadwal
              Full-width.  The inner card list is independently scrollable so
              the header and footer always stay visible even for long lists.
          ──────────────────────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-700">
            {/* Section header */}
            <div className="mb-4 flex items-center justify-between">
              <SectionLabel
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Daftar Ruangan & Jadwal"
              />
              <span className="text-xs text-gray-400">
                {totalRooms} ruangan &bull; {totalSchedules} jadwal
              </span>
            </div>

            {/* ── Card list — scrollable ── */}
            <div className="max-h-64 space-y-3 overflow-y-auto pr-0.5">
              {group.map((booking: any, bIdx: number) => {
                // Normalise: use schedules[] if present, else build one from
                // the legacy flat date / startTime / endTime fields.
                const scheds: {
                  date: string;
                  startTime: string;
                  endTime: string;
                }[] =
                  booking.schedules?.length > 0
                    ? booking.schedules
                    : [
                        {
                          date: booking.date ?? "",
                          startTime: booking.startTime ?? "",
                          endTime: booking.endTime ?? "",
                        },
                      ];

                return (
                  <div
                    key={booking.id}
                    className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    {/* ── Room card header ── */}
                    <div className="flex items-center justify-between border-b border-blue-100 bg-linear-to-r from-blue-50 to-indigo-50 px-4 py-3 dark:border-blue-800/60 dark:from-blue-950/40 dark:to-indigo-950/40">
                      {/* Room name */}
                      <span className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        {getRoomName(booking.roomId)}
                        {/* Ordinal badge when multiple rooms in the group */}
                        {totalRooms > 1 && (
                          <span className="rounded-full bg-blue-200/60 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-800/60 dark:text-blue-300">
                            #{bIdx + 1}
                          </span>
                        )}
                      </span>

                      {/* Right cluster: schedule count + status badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-blue-500 dark:text-blue-400">
                          {scheds.length} jadwal
                        </span>
                        <StatusBadge status={booking.status} size="sm" />
                      </div>
                    </div>

                    {/* ── Schedule table ── */}
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/80 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                          <th className="w-8 py-2 pl-4 pr-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Tanggal</th>
                          <th className="px-3 py-2 text-left">Mulai</th>
                          <th className="px-3 py-2 text-left">Selesai</th>
                          <th className="px-3 py-2 text-left">Durasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700/40 dark:bg-gray-900/30">
                        {scheds.map(
                          (
                            s: {
                              date: string;
                              startTime: string;
                              endTime: string;
                            },
                            sIdx: number,
                          ) => (
                            <tr
                              key={sIdx}
                              className="text-xs transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                            >
                              {/* Row number */}
                              <td className="py-2.5 pl-4 pr-2 font-mono tabular-nums text-gray-400">
                                {sIdx + 1}
                              </td>

                              {/* Date */}
                              <td className="px-3 py-2.5">
                                <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                  <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
                                  {formatDateID(s.date)}
                                </span>
                              </td>

                              {/* Start time */}
                              <td className="px-3 py-2.5">
                                <span className="inline-flex items-center gap-1 font-mono text-gray-700 dark:text-gray-300">
                                  <Clock className="h-3 w-3 shrink-0 text-gray-400" />
                                  {s.startTime?.slice(0, 5)}
                                </span>
                              </td>

                              {/* End time */}
                              <td className="px-3 py-2.5 font-mono text-gray-700 dark:text-gray-300">
                                {s.endTime?.slice(0, 5)}
                              </td>

                              {/* Duration pill */}
                              <td className="px-3 py-2.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-700/60 dark:text-gray-400">
                                  <Timer className="h-2.5 w-2.5" />
                                  {computeDuration(s.startTime, s.endTime)}
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────
              BOTTOM SECTION — Surat Permohonan download banner
          ──────────────────────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-700">
            <div
              className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                (selectedBooking as any).hasFile
                  ? "border-blue-100 bg-blue-50 dark:border-blue-800/60 dark:bg-blue-900/20"
                  : "border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/30"
              }`}
            >
              {/* File info */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    (selectedBooking as any).hasFile
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "bg-gray-200 text-gray-400 dark:bg-gray-600"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Surat Permohonan.pdf
                  </p>
                  <p className="text-xs text-gray-400">
                    {(selectedBooking as any).hasFile
                      ? "Dokumen PDF tersedia"
                      : "Belum ada dokumen yang diunggah"}
                  </p>
                </div>
              </div>

              {/* Open button */}
              {(selectedBooking as any).hasFile && (
                <button
                  onClick={(e: React.MouseEvent) =>
                    handleViewFile(e, selectedBooking.id)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                >
                  <Download className="h-3.5 w-3.5" />
                  Buka File
                </button>
              )}
            </div>
          </div>

          {/* ── Hidden ticket markup — used only for print export ── */}
          <div className="absolute -left-9999px top-0">
            <div ref={ticketRef} className="w-full text-black">
                <div className="relative z-10">
                    {/* Kop Surat */}
                    <div className="flex items-center border-b-4 border-double border-gray-900 pb-6 mb-8">
                        <img src={nocLogo} alt="Logo" className="w-24 h-24 object-contain mr-6" />
                        <div className="flex-1 text-center">
                            <h2 className="text-xl font-bold uppercase tracking-wider text-gray-800">Universitas Kristen Satya Wacana</h2>
                            <h1 className="text-2xl font-extrabold uppercase tracking-widest text-blue-900 mt-1">Fakultas Teknologi Informasi</h1>
                            <p className="text-sm text-gray-600 mt-2">Jl. Dr. O. Notohamidjojo No.1-10, Blotongan, Salatiga 50715</p>
                            <p className="text-sm text-gray-600">Email: fti.laboran@adm.uksw.edu | Telp: (0298) 321212</p>
                        </div>
                        <div className="w-24 h-24 flex items-center justify-center">
                            <QRCode value={selectedBooking.id} size={80} level="M" />
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h3 className="text-xl font-bold text-black underline underline-offset-4 mb-2">SURAT PERSETUJUAN PEMINJAMAN FASILITAS</h3>
                        <p className="text-sm text-gray-600 font-mono">No. Reg: {selectedBooking.id}</p>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-800 leading-relaxed text-justify mb-4">
                            Berdasarkan permohonan peminjaman fasilitas yang diajukan pada sistem CORE.FTI, dengan ini Laboratorium Fakultas Teknologi Informasi UKSW menerangkan bahwa:
                        </p>
                    </div>

                    {/* Data Peminjam */}
                    <div className="mb-8">
                        <table className="w-full text-left border-collapse">
                            <tbody>
                                <tr>
                                    <td className="py-2 w-1/3 font-semibold text-gray-700">Nama Peminjam</td>
                                    <td className="py-2 w-4 text-center">:</td>
                                    <td className="py-2 font-bold text-gray-900">{selectedBooking.userName}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700">NIM / NIDN</td>
                                    <td className="py-2 text-center">:</td>
                                    <td className="py-2 text-gray-800">{selectedBooking.userId}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700">Penanggung Jawab</td>
                                    <td className="py-2 text-center">:</td>
                                    <td className="py-2 text-gray-800">{selectedBooking.responsiblePerson}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700">Kontak Person</td>
                                    <td className="py-2 text-center">:</td>
                                    <td className="py-2 text-gray-800">{selectedBooking.contactPerson}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-800 leading-relaxed text-justify mb-4">
                            Telah <strong className="text-green-700">DISETUJUI</strong> untuk menggunakan fasilitas ruangan sebagai berikut:
                        </p>
                    </div>

                    {/* Data Kegiatan & Ruangan */}
                    <div className="mb-8">
                        <table className="w-full text-left border-collapse">
                            <tbody>
                                <tr>
                                    <td className="py-2 w-1/3 font-semibold text-gray-700">Nama Kegiatan</td>
                                    <td className="py-2 w-4 text-center">:</td>
                                    <td className="py-2 font-bold text-gray-900">{selectedBooking.purpose}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700 items-start align-top">Ruangan & Waktu</td>
                                    <td className="py-2 text-center align-top">:</td>
                                    <td className="py-2 text-gray-800">
                                        <ul className="list-disc ml-4 space-y-1">
                                            {group.map((b: any, bIdx: number) => {
                                               const scheds = b.schedules?.length > 0 ? b.schedules : [{ date: b.date, startTime: b.startTime, endTime: b.endTime }];
                                               return scheds.map((sch: any, idx: number) => (
                                                 <li key={`${bIdx}-${idx}`}>
                                                    <span className="font-bold text-blue-800">{getRoomName(b.roomId)}</span> —{" "}
                                                    <span className="font-semibold">{new Date(sch.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>,{" "}
                                                    Pukul {sch.startTime?.slice(0,5)} s.d {sch.endTime?.slice(0,5)} WIB
                                                 </li>
                                               ));
                                            })}
                                        </ul>
                                    </td>
                                </tr>
                                {(selectedBooking.techSupportPicName || selectedBooking.techSupportNeeds) && (
                                <tr>
                                    <td className="items-start align-top py-2 font-semibold text-gray-700">Dukungan Teknis</td>
                                    <td className="align-top py-2 text-center">:</td>
                                    <td className="py-2 text-gray-800">
                                        {selectedBooking.techSupportPicName && <div>PIC: {selectedBooking.techSupportPicName}</div>}
                                        {selectedBooking.techSupportNeeds && <div>Kebutuhan: {selectedBooking.techSupportNeeds}</div>}
                                    </td>
                                </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-12">
                        <p className="text-gray-800 leading-relaxed text-justify">
                            Demikian surat persetujuan ini diterbitkan secara otomatis oleh sistem untuk dapat digunakan sebagaimana mestinya. Peminjam wajib menjaga kebersihan dan keamanan fasilitas yang digunakan.
                        </p>
                    </div>

                    {/* Tanda Tangan */}
                    <div className="flex justify-between items-end pt-8">
                        <div className="text-xs text-gray-400">
                            <p>Dokumen sah dicetak dari sistem CORE.FTI.</p>
                            <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="text-center w-64">
                            <p className="text-sm text-gray-800 mb-2">Salatiga, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="text-sm font-bold text-gray-800 mb-16">Admin Laboratorium</p>
                            <div className="border-b border-gray-400 w-full mb-2"></div>
                            <p className="text-xs text-gray-500">Fakultas Teknologi Informasi</p>
                        </div>
                    </div>
                </div>
          </div>
        </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MODAL FOOTER — Action buttons
            Ordered left-to-right: Tutup → secondary → destructive → status
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-50/80 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/60">
          {/* Always shown */}
          <button
            onClick={() => setSelectedBooking(null)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Tutup
          </button>

          {/* ── APPROVED actions ── */}
          {selectedBooking.status === BookingStatus.APPROVED && (
            <>
              <button
                onClick={handlePrintProof}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Printer className="h-4 w-4" />
                Cetak Bukti
              </button>

              <button
                onClick={() => {
                  setSelectedBooking(null);
                  handleRejectClick(selectedBooking);
                }}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <AlertTriangle className="h-4 w-4" />
                Batalkan
              </button>

              <button
                onClick={() => {
                  setSelectedBooking(null);
                  handleDeleteClick(selectedBooking);
                }}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Data
              </button>
            </>
          )}

          {/* ── PENDING actions ── */}
          {selectedBooking.status === BookingStatus.PENDING && (
            <>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  handleRejectClick(selectedBooking);
                }}
                disabled={processingId === selectedBooking.id}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {processingId === selectedBooking.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Tolak
              </button>

              <button
                onClick={() => {
                  setSelectedBooking(null);
                  handleApproveClick(selectedBooking);
                }}
                disabled={processingId === selectedBooking.id}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {processingId === selectedBooking.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Setuju Peminjaman
              </button>
            </>
          )}

          {/* ── REJECTED action ── */}
          {selectedBooking.status === BookingStatus.REJECTED && (
            <button
              onClick={() => {
                setSelectedBooking(null);
                handleDeleteClick(selectedBooking);
              }}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Hapus Data
            </button>
          )}

          {/* Static status badge (non-pending) */}
          {selectedBooking.status !== BookingStatus.PENDING && (
            <span
              className={`flex items-center rounded-lg border px-4 py-2 text-sm font-medium ${
                selectedBooking.status === BookingStatus.APPROVED
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              Status: {selectedBooking.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
