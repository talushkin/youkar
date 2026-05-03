"use client";

import { useState } from "react";
import Image from "next/image";

interface SongRequest {
  id: number;
  singer: string;
  song: string;
  requester: string;
  notes: string;
  status: "ממתין" | "בתור" | "הושמע";
}

const PRICE_PER_SONG = 10;

const INITIAL_QUEUE: SongRequest[] = [
  { id: 1, singer: "עברי לידר", song: "אהבה גדולה", requester: "מיכל כ.", notes: "", status: "בתור" },
  { id: 2, singer: "אייל גולן", song: "בוא אלי", requester: "יוסי ל.", notes: "בבקשה מהר!", status: "ממתין" },
];

export default function Home() {
  const [requests, setRequests] = useState<SongRequest[]>(INITIAL_QUEUE);
  const [form, setForm] = useState({ singer: "", song: "", requester: "", notes: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.singer.trim()) e.singer = "שדה חובה";
    if (!form.song.trim()) e.song = "שדה חובה";
    if (!form.requester.trim()) e.requester = "שדה חובה";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const newReq: SongRequest = {
      id: Date.now(),
      singer: form.singer.trim(),
      song: form.song.trim(),
      requester: form.requester.trim(),
      notes: form.notes.trim(),
      status: "ממתין",
    };
    setRequests(prev => [newReq, ...prev]);
    setForm({ singer: "", song: "", requester: "", notes: "" });
    setErrors({});
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const statusColor = (s: SongRequest["status"]) => {
    if (s === "הושמע") return "bg-green-700 text-green-100";
    if (s === "בתור") return "bg-blue-700 text-blue-100";
    return "bg-yellow-700 text-yellow-100";
  };

  const totalAmount = requests.filter(r => r.status !== "הושמע").length * PRICE_PER_SONG;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="gradient-header border-b border-white/10 shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <Image
              src="https://github.com/user-attachments/assets/5ab2bc08-a183-484b-ae14-30390eb197b7"
              alt="YouKar Logo"
              fill
              className="object-contain rounded-xl"
              unoptimized
            />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-widest text-white">
              YOU<span className="text-[#e31221]">KAR</span>
            </h1>
            <p className="text-sm text-blue-200 font-medium">קבוצת WA קריוקי 🎤</p>
            <p className="text-xs text-white/40 mt-0.5">עמוד בקשות ותשלום</p>
          </div>
          <div className="mr-auto flex items-center gap-2 bg-[#e31221]/20 border border-[#e31221]/40 rounded-xl px-4 py-2">
            <span className="text-2xl">🎵</span>
            <div className="text-left">
              <p className="text-xs text-white/60">שירים בתור</p>
              <p className="text-xl font-bold text-white">{requests.filter(r => r.status !== "הושמע").length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8">

        {/* ===== SUCCESS BANNER ===== */}
        {submitted && (
          <div className="fade-in bg-green-800/80 border border-green-500/60 rounded-xl px-5 py-3 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <p className="text-green-100 font-semibold">הבקשה נשלחה בהצלחה! תוסיפו לתור 🎶</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ===== REQUEST FORM ===== */}
          <section className="card-glass rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <span className="text-2xl">🎤</span> בקשת שיר חדשה
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Singer */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">
                  שם הזמרן/הזמרת <span className="text-[#e31221]">*</span>
                </label>
                <input
                  type="text"
                  value={form.singer}
                  onChange={handleChange("singer")}
                  placeholder="לדוגמה: עברי לידר"
                  className={`input-field w-full rounded-lg px-4 py-2.5 text-sm ${errors.singer ? "border-red-500" : ""}`}
                />
                {errors.singer && <p className="text-red-400 text-xs mt-1">{errors.singer}</p>}
              </div>

              {/* Song */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">
                  שם השיר <span className="text-[#e31221]">*</span>
                </label>
                <input
                  type="text"
                  value={form.song}
                  onChange={handleChange("song")}
                  placeholder="לדוגמה: אהבה גדולה"
                  className={`input-field w-full rounded-lg px-4 py-2.5 text-sm ${errors.song ? "border-red-500" : ""}`}
                />
                {errors.song && <p className="text-red-400 text-xs mt-1">{errors.song}</p>}
              </div>

              {/* Requester */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">
                  שם המבקש <span className="text-[#e31221]">*</span>
                </label>
                <input
                  type="text"
                  value={form.requester}
                  onChange={handleChange("requester")}
                  placeholder="השם שלך"
                  className={`input-field w-full rounded-lg px-4 py-2.5 text-sm ${errors.requester ? "border-red-500" : ""}`}
                />
                {errors.requester && <p className="text-red-400 text-xs mt-1">{errors.requester}</p>}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">
                  הערות <span className="text-white/30 text-xs">(אופציונלי)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={handleChange("notes")}
                  placeholder="הערות נוספות..."
                  rows={3}
                  className="input-field w-full rounded-lg px-4 py-2.5 text-sm resize-none"
                />
              </div>

              <button type="submit" className="btn-red w-full text-white font-bold py-3 rounded-xl text-base shadow-lg">
                🎵 שלח בקשה
              </button>
            </form>
          </section>

          {/* ===== PAYMENT SECTION ===== */}
          <section className="space-y-6">
            <div className="card-glass rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">💳</span> תשלום
              </h2>
              <div className="bg-[#0f1929] rounded-xl p-4 mb-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">מחיר לשיר</span>
                  <span className="font-semibold text-white">₪{PRICE_PER_SONG}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">שירים בתור</span>
                  <span className="font-semibold text-white">{requests.filter(r => r.status !== "הושמע").length}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                  <span className="font-bold text-white">סה&quot;כ לתשלום</span>
                  <span className="text-2xl font-extrabold text-[#e31221]">₪{totalAmount}</span>
                </div>
              </div>
              <button
                onClick={() => alert("מעבר לדף תשלום - בקרוב!")}
                className="btn-red w-full text-white font-bold py-3 rounded-xl text-base shadow-lg flex items-center justify-center gap-2"
              >
                <span>💳</span> שלם עכשיו
              </button>
              <p className="text-center text-white/30 text-xs mt-3">תשלום מאובטח · Bit / PayPal / כרטיס אשראי</p>
            </div>

            {/* WhatsApp CTA */}
            <div className="card-glass rounded-2xl p-5 shadow-xl border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  💬
                </div>
                <div>
                  <p className="font-bold text-white text-sm">הצטרפו לקבוצת WA שלנו</p>
                  <p className="text-white/50 text-xs mt-0.5">עדכונים, תאריכים ועוד</p>
                </div>
                <a
                  href="https://chat.whatsapp.com/youkar-group"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-auto bg-green-600 hover:bg-green-500 transition text-white text-sm font-bold px-4 py-2 rounded-lg whitespace-nowrap"
                >
                  הצטרף
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* ===== SONG QUEUE ===== */}
        <section className="card-glass rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <span className="text-2xl">📋</span> תור הבקשות
            <span className="mr-auto text-sm text-white/40 font-normal">{requests.length} בקשות</span>
          </h2>

          {requests.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <p className="text-4xl mb-3">🎵</p>
              <p>אין בקשות עדיין. היו הראשונים!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-xs">
                    <th className="text-right pb-3 pr-2 font-medium">#</th>
                    <th className="text-right pb-3 font-medium">זמר/ת</th>
                    <th className="text-right pb-3 font-medium">שיר</th>
                    <th className="text-right pb-3 font-medium">בקשה של</th>
                    <th className="text-right pb-3 font-medium">הערות</th>
                    <th className="text-right pb-3 pl-2 font-medium">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors fade-in"
                    >
                      <td className="py-3 pr-2 text-white/30 font-mono">{i + 1}</td>
                      <td className="py-3 font-semibold text-white">{r.singer}</td>
                      <td className="py-3 text-blue-200">{r.song}</td>
                      <td className="py-3 text-white/70">{r.requester}</td>
                      <td className="py-3 text-white/40 text-xs max-w-[120px] truncate">{r.notes || "—"}</td>
                      <td className="py-3 pl-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/10 bg-[#0a1120] mt-4">
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/60 text-sm">YOU<span className="text-[#e31221]">KAR</span></span>
            <span>· קבוצת WA קריוקי</span>
          </div>
          <p>© {new Date().getFullYear()} YouKar · כל הזכויות שמורות</p>
          <a href="https://chat.whatsapp.com/youkar-group" target="_blank" rel="noopener noreferrer"
            className="text-green-400/70 hover:text-green-400 transition flex items-center gap-1">
            💬 WhatsApp Group
          </a>
        </div>
      </footer>
    </div>
  );
}
