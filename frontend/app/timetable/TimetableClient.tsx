"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  BookOpenIcon,
  DoubtIcon,
  CoffeeIcon,
  CheckIcon,
  NoticeIcon,
  ZapIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import {
  apiFetch,
  type TimetableResponse,
  type TimetableSlot,
  type DaySchedule,
} from "@/lib/api";
import styles from "./timetable.module.css";

type Props = {
  initialData: TimetableResponse;
  isCr: boolean;
  token: string | null;
};

const BATCH_OPTIONS = [
  { value: "ALL", label: "All Batches" },
  { value: "A1", label: "Batch A1" },
  { value: "A2", label: "Batch A2" },
  { value: "A3", label: "Batch A3" },
] as const;

export default function TimetableClient({ initialData, isCr, token }: Props) {
  const [data, setData] = useState<TimetableResponse>(initialData);
  const [selectedBatch, setSelectedBatch] = useState<string>(initialData.selected_batch || "ALL");
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = initialData.current_day;
    const match = initialData.days.find(
      (d) => d.day.toLowerCase() === today.toLowerCase()
    );
    return match ? match.day : initialData.days[0]?.day || "Monday";
  });

  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [isPostingNotice, setIsPostingNotice] = useState(false);
  const [announcements, setAnnouncements] = useState(initialData.announcements || []);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Restore saved batch from localStorage on mount
  useEffect(() => {
    try {
      const savedBatch = localStorage.getItem("margins_timetable_batch");
      if (savedBatch && ["ALL", "A1", "A2", "A3"].includes(savedBatch) && savedBatch !== selectedBatch) {
        handleBatchChange(savedBatch);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  async function handleBatchChange(batch: string) {
    setSelectedBatch(batch);
    try {
      localStorage.setItem("margins_timetable_batch", batch);
    } catch {
      // Ignore
    }

    setIsLoadingBatch(true);
    try {
      const res = await apiFetch<TimetableResponse>(
        `/timetable?batch=${encodeURIComponent(batch)}`,
        token
      );
      setData(res);
      setAnnouncements(res.announcements || []);
    } catch {
      // Keep previous data on network failure
    } finally {
      setIsLoadingBatch(false);
    }
  }

  async function handlePostAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!noticeText.trim() || isPostingNotice) return;

    setIsPostingNotice(true);
    setFeedbackMsg(null);
    try {
      const newAnn = await apiFetch<{
        id: string;
        text: string;
        posted_by: string;
        created_at: string;
      }>("/timetable/announcements", token, {
        method: "POST",
        body: JSON.stringify({ text: noticeText.trim() }),
      });
      setAnnouncements((prev) => [newAnn, ...prev]);
      setNoticeText("");
      setFeedbackMsg("Schedule notice broadcast to class timetable.");
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg(err.message || "Failed to post timetable announcement.");
    } finally {
      setIsPostingNotice(false);
    }
  }

  const currentDaySchedule: DaySchedule | undefined = data.days.find(
    (d) => d.day.toLowerCase() === selectedDay.toLowerCase()
  );

  const activeSlot = data.current_slot;
  const nextSlot = data.next_slot;
  const isSelectedDayToday = selectedDay.toLowerCase() === data.current_day.toLowerCase();

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={`card ${styles.pageHeader}`}>
        <div className={styles.headerLeft}>
          <div className={styles.titleBadge}>
            <CalendarIcon size={18} aria-hidden="true" />
            <span>Academic Schedule</span>
          </div>
          <h1 className={styles.title}>class timetable</h1>
          <p className={styles.subtitle}>
            TCET Mumbai AI&DS — Division A (Semester 4)
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.liveClockBadge}>
            <span className={styles.livePulseDot} aria-hidden="true" />
            <span className={styles.liveClockText}>IST {data.current_time_ist}</span>
          </div>

          <div className={styles.batchSelectorGroup} role="group" aria-label="Lab Batch Filter">
            <span className={styles.batchLabel}>Batch:</span>
            <div className={styles.batchPills}>
              {BATCH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleBatchChange(opt.value)}
                  className={`${styles.batchPill} ${
                    selectedBatch === opt.value ? styles.batchPillActive : ""
                  }`}
                  disabled={isLoadingBatch}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Live Now & Next Class Shelf */}
      <section className={styles.liveShelfGrid} aria-label="Today's Current & Next Classes">
        {/* Card 1: Live Now Slot */}
        <div className={`card ${styles.statusCard} ${activeSlot ? styles.statusCardLive : ""}`}>
          <div className={styles.statusCardHeader}>
            <span className={activeSlot ? styles.badgeLive : styles.badgeOffline}>
              {activeSlot ? (
                <>
                  <span className={styles.statusDotLive} aria-hidden="true" />
                  LIVE NOW
                </>
              ) : (
                "NO ACTIVE LECTURE"
              )}
            </span>
            {activeSlot && (
              <span className={styles.slotTime}>{activeSlot.time_display}</span>
            )}
          </div>

          {activeSlot ? (
            <div className={styles.statusCardBody}>
              <div className={styles.statusSubjectRow}>
                <span className={styles.subjectCodeBadge}>{activeSlot.subject_code}</span>
                <h2 className={styles.statusSubjectName}>{activeSlot.subject_name}</h2>
              </div>

              <div className={styles.statusMetaRow}>
                <div className={styles.metaItem}>
                  <MapPinIcon size={16} aria-hidden="true" />
                  <span>{activeSlot.room}</span>
                </div>
                <div className={styles.metaItem}>
                  <UserIcon size={16} aria-hidden="true" />
                  <span>{activeSlot.faculty}</span>
                </div>
                {activeSlot.batch && activeSlot.batch !== "all" && (
                  <div className={styles.batchSpecificBadge}>
                    Batch {activeSlot.batch}
                  </div>
                )}
              </div>

              {activeSlot.notes && (
                <p className={styles.statusNotes}>{activeSlot.notes}</p>
              )}

              <div className={styles.statusActions}>
                <Link
                  href={
                    activeSlot.subject_id
                      ? `/subjects/${activeSlot.subject_id}`
                      : `/subjects?q=${encodeURIComponent(activeSlot.subject_code)}`
                  }
                  className={styles.actionBtnPrimary}
                >
                  <BookOpenIcon size={15} aria-hidden="true" />
                  <span>Subject Hub</span>
                </Link>
                <Link
                  href={`/doubts?subject=${encodeURIComponent(activeSlot.subject_code)}`}
                  className={styles.actionBtnSecondary}
                >
                  <DoubtIcon size={15} aria-hidden="true" />
                  <span>Ask a Doubt</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.statusCardEmpty}>
              <ClockIcon size={24} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>
                No ongoing lecture or lab right now. Check upcoming periods below.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Next Class Slot */}
        <div className={`card ${styles.statusCard}`}>
          <div className={styles.statusCardHeader}>
            <span className={styles.badgeNext}>
              <ClockIcon size={14} aria-hidden="true" />
              NEXT UP
            </span>
            {nextSlot && typeof nextSlot.minutes_until === "number" && (
              <span className={styles.countdownBadge}>
                In {nextSlot.minutes_until} mins
              </span>
            )}
          </div>

          {nextSlot ? (
            <div className={styles.statusCardBody}>
              <div className={styles.statusSubjectRow}>
                <span className={styles.subjectCodeBadgeNext}>{nextSlot.subject_code}</span>
                <h2 className={styles.statusSubjectName}>{nextSlot.subject_name}</h2>
              </div>

              <div className={styles.statusMetaRow}>
                <div className={styles.metaItem}>
                  <ClockIcon size={16} aria-hidden="true" />
                  <span>{nextSlot.time_display}</span>
                </div>
                <div className={styles.metaItem}>
                  <MapPinIcon size={16} aria-hidden="true" />
                  <span>{nextSlot.room}</span>
                </div>
                <div className={styles.metaItem}>
                  <UserIcon size={16} aria-hidden="true" />
                  <span>{nextSlot.faculty}</span>
                </div>
              </div>

              {nextSlot.notes && (
                <p className={styles.statusNotes}>{nextSlot.notes}</p>
              )}

              <div className={styles.statusActions}>
                <Link
                  href={`/resources?subject=${encodeURIComponent(nextSlot.subject_code)}`}
                  className={styles.actionBtnSecondary}
                >
                  <ZapIcon size={15} aria-hidden="true" />
                  <span>Cram Notes & PYQs</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.statusCardEmpty}>
              <CheckIcon size={24} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>
                All academic sessions for today have concluded. Enjoy your evening study session!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Announcements Bar */}
      {announcements.length > 0 && (
        <section className={`card ${styles.announcementsCard}`} aria-label="Schedule Announcements">
          <div className={styles.announcementHeader}>
            <div className={styles.announcementTitle}>
              <NoticeIcon size={18} aria-hidden="true" />
              <span>Timetable Notices & Room Changes</span>
            </div>
          </div>
          <div className={styles.announcementsList}>
            {announcements.map((ann) => (
              <div key={ann.id} className={styles.announcementItem}>
                <p className={styles.announcementText}>{ann.text}</p>
                <div className={styles.announcementMeta}>
                  <span>Posted by {ann.posted_by}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CR Schedule Notice Composer */}
      {isCr && (
        <section className={`card ${styles.crComposerCard}`}>
          <h2 className={styles.crTitle}>
            <NoticeIcon size={16} aria-hidden="true" />
            Broadcast Timetable Notice (Class Representative)
          </h2>
          <form onSubmit={handlePostAnnouncement} className={styles.crForm}>
            <input
              type="text"
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              placeholder="e.g. Tomorrow 10:00 AM DBMS lecture shifted to Classroom 405"
              className={styles.crInput}
              disabled={isPostingNotice}
              maxLength={300}
            />
            <button
              type="submit"
              disabled={isPostingNotice || !noticeText.trim()}
              className={styles.crSubmitBtn}
            >
              <PlusIcon size={16} aria-hidden="true" />
              <span>{isPostingNotice ? "Posting..." : "Post Notice"}</span>
            </button>
          </form>
          {feedbackMsg && (
            <p className={styles.feedbackMsg}>{feedbackMsg}</p>
          )}
        </section>
      )}

      {/* Day Tabs Navigation */}
      <nav className={styles.dayTabsNav} aria-label="Day of week">
        {data.days.map((dayObj) => {
          const isCurrentToday = dayObj.day.toLowerCase() === data.current_day.toLowerCase();
          const isTabActive = dayObj.day.toLowerCase() === selectedDay.toLowerCase();

          return (
            <button
              key={dayObj.day}
              type="button"
              onClick={() => setSelectedDay(dayObj.day)}
              className={`${styles.dayTab} ${isTabActive ? styles.dayTabActive : ""}`}
            >
              <span className={styles.dayTabName}>{dayObj.day}</span>
              {isCurrentToday && (
                <span className={styles.todayPill}>Today</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Day Schedule Timeline */}
      <main className={styles.timelineContainer}>
        {isSelectedDayToday && (
          <div className={styles.todayIndicatorBanner}>
            <span className={styles.todayBannerDot} aria-hidden="true" />
            <span>Viewing today&apos;s schedule (IST {data.current_time_ist})</span>
          </div>
        )}

        {currentDaySchedule && currentDaySchedule.slots.length > 0 ? (
          <div className={styles.slotList}>
            {currentDaySchedule.slots.map((slot) => {
              const isBreak = slot.type === "break";
              const isLab = slot.type === "lab";
              const isTutorial = slot.type === "tutorial";
              const isLecture = slot.type === "lecture";

              return (
                <article
                  key={slot.id}
                  className={`card ${styles.slotCard} ${
                    slot.is_live ? styles.slotCardLive : ""
                  } ${slot.is_past ? styles.slotCardPast : ""} ${
                    isBreak ? styles.slotCardBreak : ""
                  }`}
                >
                  {/* Slot Time Column */}
                  <div className={styles.slotTimeCol}>
                    <span className={styles.slotTimeDisplay}>{slot.time_display}</span>
                    <span className={styles.slotDuration}>
                      {isLab ? "120 mins" : isBreak ? "15-45 mins" : "60 mins"}
                    </span>
                    {slot.is_live && (
                      <span className={styles.liveTag}>LIVE NOW</span>
                    )}
                    {slot.is_past && (
                      <span className={styles.pastTag}>Finished</span>
                    )}
                  </div>

                  {/* Slot Main Content */}
                  <div className={styles.slotContentCol}>
                    <div className={styles.slotTopRow}>
                      <div className={styles.slotBadges}>
                        <span
                          className={`${styles.typeBadge} ${
                            isLab
                              ? styles.typeBadgeLab
                              : isTutorial
                              ? styles.typeBadgeTutorial
                              : isBreak
                              ? styles.typeBadgeBreak
                              : styles.typeBadgeLecture
                          }`}
                        >
                          {isBreak ? (
                            <CoffeeIcon size={12} aria-hidden="true" />
                          ) : null}
                          {slot.type.toUpperCase()}
                        </span>

                        {!isBreak && (
                          <span className={styles.codeTag}>{slot.subject_code}</span>
                        )}

                        {slot.batch && slot.batch !== "all" && (
                          <span className={styles.batchTag}>Batch {slot.batch}</span>
                        )}
                      </div>
                    </div>

                    <h2 className={styles.slotTitle}>{slot.subject_name}</h2>

                    <div className={styles.slotDetails}>
                      <div className={styles.detailItem}>
                        <MapPinIcon size={15} aria-hidden="true" />
                        <span>{slot.room}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <UserIcon size={15} aria-hidden="true" />
                        <span>{slot.faculty}</span>
                      </div>
                    </div>

                    {slot.notes && (
                      <p className={styles.slotNotes}>{slot.notes}</p>
                    )}

                    {!isBreak && (
                      <div className={styles.slotLinks}>
                        <Link
                          href={
                            slot.subject_id
                              ? `/subjects/${slot.subject_id}`
                              : `/subjects?q=${encodeURIComponent(slot.subject_code)}`
                          }
                          className={styles.slotLinkBtn}
                        >
                          <BookOpenIcon size={14} aria-hidden="true" />
                          <span>Subject Hub</span>
                        </Link>
                        <Link
                          href={`/doubts?subject=${encodeURIComponent(slot.subject_code)}`}
                          className={styles.slotLinkBtnSecondary}
                        >
                          <DoubtIcon size={14} aria-hidden="true" />
                          <span>Class Doubts</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={`card ${styles.emptyDayCard}`}>
            <CalendarIcon size={32} className={styles.emptyIcon} aria-hidden="true" />
            <h2 className={styles.emptyDayTitle}>No scheduled sessions for this day</h2>
            <p className={styles.emptyDayText}>
              Enjoy your self-study time or explore resource study shelves.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
