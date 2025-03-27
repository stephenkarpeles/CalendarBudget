import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

type CalendarItem = {
  id: string;
  userId: string;
  date: string;       
  description: string;
  amount: number;
  isIncome: boolean;
  excludedFromEOD?: boolean;
  source: 'transaction' | 'budget';
};

export default function CalendarScreen() {
  const { user } = useAuth();
  const [itemsByDate, setItemsByDate] = useState<Record<string, CalendarItem[]>>({});

  useEffect(() => {
    if (!user) return;

    // Listen to transactions
    const txRef = collection(db, 'transactions');
    const txQ = query(txRef, where('userId', '==', user.uid));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const newTransactions: CalendarItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.date) {
          newTransactions.push({
            id: docSnap.id,
            userId: d.userId,
            date: d.date,
            description: d.description || '',
            amount: d.amount || 0,
            isIncome: !!d.isIncome,
            excludedFromEOD: d.excludedFromEOD,
            source: 'transaction',
          });
        }
      });
      handleMergeData(newTransactions, null); 
    });

    // Listen to budget items
    const bRef = collection(db, 'budgetItems');
    const bQ = query(bRef, where('userId', '==', user.uid));
    const unsubB = onSnapshot(bQ, (snapshot) => {
      const newBudget: CalendarItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.startDate) {
          newBudget.push({
            id: docSnap.id,
            userId: d.userId,
            date: d.startDate, 
            description: d.name || '',
            amount: d.amount || 0,
            isIncome: !!d.isIncome,
            excludedFromEOD: d.excludedFromEOD,
            source: 'budget',
          });
        }
      });
      handleMergeData(null, newBudget);
    });

    return () => {
      unsubTx();
      unsubB();
    };
  }, [user]);

  const [localTransactions, setLocalTransactions] = useState<CalendarItem[]>([]);
  const [localBudget, setLocalBudget] = useState<CalendarItem[]>([]);

  const handleMergeData = (incomingTx: CalendarItem[] | null, incomingB: CalendarItem[] | null) => {
    if (incomingTx) setLocalTransactions(incomingTx);
    if (incomingB) setLocalBudget(incomingB);
  };

  useEffect(() => {
    const merged: Record<string, CalendarItem[]> = {};

    [...localTransactions, ...localBudget].forEach((item) => {
      const d = item.date;
      if (!merged[d]) merged[d] = [];
      merged[d].push(item);
    });

    setItemsByDate(merged);
  }, [localTransactions, localBudget]);

  const handleRemoveClick = async (item: CalendarItem) => {
    Alert.alert(
      'Remove from EOD total?',
      `Remove "${item.description}" from today's total?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const collectionName =
                item.source === 'transaction' ? 'transactions' : 'budgetItems';
              await updateDoc(doc(db, collectionName, item.id), {
                excludedFromEOD: true,
              });
            } catch (err) {
              console.error(err);
            }
          },
        },
      ]
    );
  };

  const renderDay = useCallback(({ date, state }: { date: DateData; state: 'disabled' | 'today' | '' }) => {
    if (state === 'disabled') {
      return (
        <View style={[styles.dayContainer, { opacity: 0.3 }]}>
          <Text style={styles.dayText}>{date.day}</Text>
        </View>
      );
    }
    const dateStr = date.dateString;
    const allItems = itemsByDate[dateStr] || [];
    const relevant = allItems.filter((x) => !x.excludedFromEOD);

    const incomes = relevant.filter((x) => x.isIncome);
    const expenses = relevant.filter((x) => !x.isIncome);

    const sumIncomes = incomes.reduce((s, x) => s + x.amount, 0);
    const sumExpenses = expenses.reduce((s, x) => s + x.amount, 0);
    const eodTotal = sumIncomes - sumExpenses;

    return (
      <View style={styles.dayContainer}>
        <Text style={[styles.dayText, state === 'today' && styles.todayText]}>
          {date.day}
        </Text>
        <ScrollView style={{ maxHeight: 80 }}>
          {incomes.map((it) => (
            <Pressable
              key={it.id}
              style={styles.incomeItem}
              onPress={() => handleRemoveClick(it)}
            >
              <Text style={styles.itemText}>
                + ${it.amount} {it.description}
              </Text>
            </Pressable>
          ))}
          {incomes.length > 0 && expenses.length > 0 && <View style={styles.separator} />}
          {expenses.map((it) => (
            <Pressable
              key={it.id}
              style={styles.expenseItem}
              onPress={() => handleRemoveClick(it)}
            >
              <Text style={styles.itemText}>
                - ${it.amount} {it.description}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.eodText}>
          EOD: {eodTotal >= 0 ? `\$${eodTotal}` : `-\$${Math.abs(eodTotal)}`}
        </Text>
      </View>
    );
  }, [itemsByDate]);

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
        <Text>Please log in to view your calendar.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Calendar
        dayComponent={renderDay}
        onDayPress={(day: { dateString: any; }) => console.log('Pressed day:', day.dateString)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dayContainer: {
    flex: 1,
    margin: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dayText: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  todayText: {
    color: 'blue',
  },
  incomeItem: {
    backgroundColor: '#e0f7fa',
    marginVertical: 1,
    borderRadius: 4,
  },
  expenseItem: {
    backgroundColor: '#ffebee',
    marginVertical: 1,
    borderRadius: 4,
  },
  itemText: {
    fontSize: 10,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#aaa',
    marginVertical: 2,
  },
  eodText: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
  },
});
