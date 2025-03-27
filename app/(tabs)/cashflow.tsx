import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

type TransactionDoc = {
  date: string;   
  amount: number;
  isIncome: boolean;
  userId: string;
};

export default function CashflowScreen() {
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const colRef = collection(db, 'transactions');
    const qRef = query(colRef, where('userId', '==', user.uid));
    const unsub = onSnapshot(qRef, (snapshot) => {
      const dailyArray = new Array(daysInMonth).fill(0);

      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as TransactionDoc;
        if (!d.date) return;
        const [yStr, mStr, dayStr] = d.date.split('-');
        const y = Number(yStr);
        const m = Number(mStr) - 1; 
        const day = Number(dayStr);

        if (y === currentYear && m === currentMonth) {
          const net = d.isIncome ? d.amount : -d.amount;
          const index = day - 1;
          if (index >= 0 && index < dailyArray.length) {
            dailyArray[index] += net;
          }
        }
      });

      for (let i = 1; i < dailyArray.length; i++) {
        dailyArray[i] += dailyArray[i - 1];
      }

      setDailyData(dailyArray);
    });

    return () => unsub();
  }, [user]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Please log in to see your cashflow chart.</Text>
      </View>
    );
  }

  const labels = dailyData.map((_, i) => `${i + 1}`);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={styles.title}>Cashflow (This Month)</Text>
      {dailyData.length > 0 ? (
        <LineChart
          data={{
            labels,
            datasets: [{ data: dailyData }]
          }}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => `rgba(0,0,255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`
          }}
          bezier
          style={{ marginVertical: 8 }}
        />
      ) : (
        <Text>No data yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold' },
});
