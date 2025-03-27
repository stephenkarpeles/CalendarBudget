import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  Modal,
  TextInput,
  StyleSheet
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

type BudgetItem = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  isIncome: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'bi-monthly' | 'quarterly' | 'yearly';
  startDate: string;       
  dayOfMonth?: number;
  useLastDayOfMonth?: boolean;
};

export default function BudgetScreen() {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<BudgetItem>>({});

  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, 'budgetItems');
    const qRef = query(colRef, where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(qRef, (snapshot) => {
      const items: BudgetItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: d.userId,
          name: d.name,
          amount: d.amount,
          isIncome: d.isIncome,
          frequency: d.frequency,
          startDate: d.startDate,
          dayOfMonth: d.dayOfMonth,
          useLastDayOfMonth: d.useLastDayOfMonth,
        });
      });
      setBudgetItems(items);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    try {
      const payload = {
        userId: user.uid,
        name: currentItem.name || '',
        amount: Number(currentItem.amount) || 0,
        isIncome: !!currentItem.isIncome,
        frequency: currentItem.frequency || 'monthly',
        startDate: currentItem.startDate || '2025-03-01',
        dayOfMonth: currentItem.dayOfMonth ?? 1,
        useLastDayOfMonth: !!currentItem.useLastDayOfMonth,
      };

      if (currentItem.id) {
        const ref = doc(db, 'budgetItems', currentItem.id);
        await updateDoc(ref, payload);
      } else {
        await addDoc(collection(db, 'budgetItems'), payload);
      }
      setModalVisible(false);
      setCurrentItem({});
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item: BudgetItem) => {
    setCurrentItem(item);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'budgetItems', id));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Please log in to manage budget items.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Add Budget Item" onPress={() => setModalVisible(true)} />

      <FlatList
        data={budgetItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View>
              <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
              <Text>
                {item.isIncome ? '+' : '-'}${item.amount} / {item.frequency}
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Button title="Edit" onPress={() => handleEdit(item)} />
              <Button title="Delete" color="red" onPress={() => handleDelete(item.id)} />
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <Text style={styles.titleText}>
            {currentItem.id ? 'Edit Budget Item' : 'New Budget Item'}
          </Text>

          <Text>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={currentItem.name}
            onChangeText={(val) => setCurrentItem({ ...currentItem, name: val })}
          />

          <Text>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={String(currentItem.amount ?? '')}
            onChangeText={(val) => setCurrentItem({ ...currentItem, amount: Number(val) })}
          />

          <Button
            title={currentItem.isIncome ? 'Switch to Expense' : 'Switch to Income'}
            onPress={() => setCurrentItem({ ...currentItem, isIncome: !currentItem.isIncome })}
          />

          <Text>Frequency</Text>
          <Picker
            selectedValue={currentItem.frequency ?? 'monthly'}
            onValueChange={(val) => setCurrentItem({ ...currentItem, frequency: val })}
            style={{ marginVertical: 8 }}
          >
            <Picker.Item label="Daily" value="daily" />
            <Picker.Item label="Weekly" value="weekly" />
            <Picker.Item label="Monthly" value="monthly" />
            <Picker.Item label="Bi-monthly" value="bi-monthly" />
            <Picker.Item label="Quarterly" value="quarterly" />
            <Picker.Item label="Yearly" value="yearly" />
          </Picker>

          <Text>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="2025-03-01"
            value={currentItem.startDate}
            onChangeText={(val) => setCurrentItem({ ...currentItem, startDate: val })}
          />

          <Text>Day of Month</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            keyboardType="numeric"
            value={String(currentItem.dayOfMonth ?? '')}
            onChangeText={(val) => setCurrentItem({ ...currentItem, dayOfMonth: Number(val) })}
          />

          <View style={{ flexDirection: 'row', marginVertical: 8 }}>
            <Text style={{ marginRight: 10 }}>Last Day of Month?</Text>
            <Button
              title={currentItem.useLastDayOfMonth ? 'Yes' : 'No'}
              onPress={() =>
                setCurrentItem({
                  ...currentItem,
                  useLastDayOfMonth: !currentItem.useLastDayOfMonth,
                })
              }
            />
          </View>

          <Button title="Save" onPress={handleSave} />
          <Button
            title="Cancel"
            onPress={() => {
              setModalVisible(false);
              setCurrentItem({});
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    marginTop: 50,
  },
  titleText: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    marginVertical: 5,
    padding: 8,
    borderRadius: 4,
  },
});
