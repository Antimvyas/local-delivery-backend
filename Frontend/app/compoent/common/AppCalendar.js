import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Modal } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import Text from "../../GlobalText";
import PrimaryButton from "./PrimaryButton";

export default function AppCalendar({ 
  visible, 
  onClose, 
  onSelectDateRange, 
  initialStartDate = null, 
  initialEndDate = null 
}) {
  const today = new Date();
  
  // States for displayed month/year in calendar navigation
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Selection states
  const [startDate, setStartDate] = useState(initialStartDate ? new Date(initialStartDate) : null);
  const [endDate, setEndDate] = useState(initialEndDate ? new Date(initialEndDate) : null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Navigation handlers
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const prevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const nextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  // Helper calculation functions
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDatePress = (day) => {
    const selectedDate = new Date(currentYear, currentMonth, day);

    if (!startDate || (startDate && endDate)) {
      setStartDate(selectedDate);
      setEndDate(null);
    } else {
      if (selectedDate < startDate) {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const clearSelection = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handleApply = () => {
    if (startDate) {
      onSelectDateRange(startDate, endDate || startDate);
    } else {
      onSelectDateRange(null, null);
    }
    onClose();
  };

  // Build grid of days
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayIndex = getFirstDayOfMonth(currentMonth, currentYear);
  const calendarCells = [];

  // Padding cells for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ key: `pad-${i}`, day: "", isPadding: true });
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(currentYear, currentMonth, d);
    
    // Check selection status
    let isSelected = false;
    let isInRange = false;
    let isStart = false;
    let isEnd = false;

    if (startDate) {
      const isStartMatch = cellDate.toDateString() === startDate.toDateString();
      const isEndMatch = endDate && cellDate.toDateString() === endDate.toDateString();
      isStart = isStartMatch;
      isEnd = isEndMatch;
      isSelected = isStartMatch || isEndMatch;

      if (endDate && cellDate > startDate && cellDate < endDate) {
        isInRange = true;
      }
    }

    const isToday = cellDate.toDateString() === today.toDateString();

    calendarCells.push({
      key: `day-${d}`,
      day: d,
      isPadding: false,
      isToday,
      isSelected,
      isInRange,
      isStart,
      isEnd,
    });
  }

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Calendar Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Dates</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Month/Year Navigation */}
          <View style={styles.navRow}>
            <View style={styles.navControls}>
              <TouchableOpacity onPress={prevYear} style={styles.navBtn}>
                <Icon name="chevron-double-left" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Icon name="chevron-left" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.monthYearText}>
              {months[currentMonth]} {currentYear}
            </Text>

            <View style={styles.navControls}>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Icon name="chevron-right" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={nextYear} style={styles.navBtn}>
                <Icon name="chevron-double-right" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Days of Week Labels */}
          <View style={styles.daysOfWeekRow}>
            {daysOfWeek.map((day, idx) => (
              <Text key={idx} style={styles.dayOfWeekText}>{day}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarCells.map((cell) => {
              if (cell.isPadding) {
                return <View key={cell.key} style={styles.dayCellDummy} />;
              }

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    cell.isToday && styles.dayCellToday,
                    cell.isSelected && styles.dayCellSelected,
                    cell.isStart && styles.dayCellStart,
                    cell.isEnd && styles.dayCellEnd,
                    cell.isInRange && styles.dayCellInRange,
                  ]}
                  onPress={() => handleDatePress(cell.day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      cell.isToday && styles.dayTextToday,
                      cell.isSelected && styles.dayTextSelected,
                      cell.isInRange && styles.dayTextInRange,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  {cell.isToday && (
                    <View style={[styles.todayIndicator, cell.isSelected && styles.todayIndicatorSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selection Display Info */}
          <View style={styles.selectionInfo}>
            <Text style={styles.infoText}>
              {startDate ? (
                <>
                  <Text style={{fontWeight: 'bold'}}>Start:</Text> {startDate.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {endDate && (
                    <>
                      {"  "}
                      <Text style={{fontWeight: 'bold'}}>End:</Text> {endDate.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </>
                  )}
                </>
              ) : (
                "Please select a date or range"
              )}
            </Text>
          </View>

          {/* Bottom Actions */}
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={clearSelection} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
            <PrimaryButton 
              title="Apply Filters" 
              onPress={handleApply}
              style={styles.applyBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  navControls: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  navBtn: {
    padding: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  monthYearText: {
    fontSize: typography.fontSize.sm + 1,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  daysOfWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  dayOfWeekText: {
    width: "14%",
    textAlign: "center",
    fontSize: typography.fontSize.xs,
    fontWeight: "bold",
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: spacing.md,
  },
  dayCell: {
    width: "14%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
    position: "relative",
  },
  dayCellDummy: {
    width: "14%",
    aspectRatio: 1,
    marginVertical: 2,
  },
  dayText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayTextToday: {
    fontWeight: "bold",
    color: colors.primary,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellStart: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  dayCellEnd: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  dayCellInRange: {
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    borderRadius: 0,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: "bold",
  },
  dayTextInRange: {
    color: colors.primary,
    fontWeight: "600",
  },
  todayIndicator: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  todayIndicatorSelected: {
    backgroundColor: colors.white,
  },
  selectionInfo: {
    alignItems: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  clearBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  clearText: {
    color: colors.textSecondary,
    fontWeight: "bold",
    fontSize: typography.fontSize.sm,
  },
  applyBtn: {
    flex: 1,
    minHeight: 44,
    height: 44,
  },
});
