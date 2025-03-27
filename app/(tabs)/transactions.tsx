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
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

type TransactionDoc = {
  id: string;
  userId: string;
  date: string;        
  description: string;
  amount: number;
  isIncome: boolean;
  excludedFromEOD?: boolean;
};

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTx, setCurrentTx] = useState<Partial<TransactionDoc>>({});

  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'transactions');
    const qRef = query(colRef, where('userId', '==', user.uid));
    const unsub = onSnapshot(qRef, (snapshot) => {
      const txs: TransactionDoc[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        txs.push({
          id: docSnap.id,
          userId: data.userId,
          date: data.date,
          description: data.description,
          amount: data.amount,
          isIncome: data.isIncome,
          excludedFromEOD: data.excludedFromEOD,
        });
      });
      setTransactions(txs);
    });
    return () => unsub();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    try {
      const payload = {
        userId: user.uid,
        date: currentTx.date || '2025-04-01',
        description: currentTx.description || '',
        amount: Number(currentTx.amount) || 0,
        isIncome: !!currentTx.isIncome,
        excludedFromEOD: false,
      };
      if (currentTx.id) {
        const ref = doc(db, 'transactions', currentTx.id);
        await updateDoc(ref, payload);
      } else {
        await addDoc(collection(db, 'transactions'), payload);
      }
      setModalVisible(false);
      setCurrentTx({});
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Please log in to view transactions.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Add Transaction" onPress={() => setModalVisible(true)} />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View>
              <Text style={{ fontWeight: 'bold' }}>{item.description}</Text>
              <Text>{item.date}</Text>
            </View>
            <Text>{item.isIncome ? '+' : '-'}${item.amount}</Text>
            <Button title="Delete" color="red" onPress={() => handleDelete(item.id)} />
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text>{currentTx.id ? 'Edit Transaction' : 'New Transaction'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Date (YYYY-MM-DD)"
            value={currentTx.date}
            onChangeText={(val) => setCurrentTx({ ...currentTx, date: val })}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={currentTx.description}
            onChangeText={(val) => setCurrentTx({ ...currentTx, description: val })}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={String(currentTx.amount ?? '')}
            onChangeText={(val) => setCurrentTx({ ...currentTx, amount: Number(val) })}
          />
          <Button
            title={currentTx.isIncome ? 'Switch to Expense' : 'Switch to Income'}
            onPress={() => setCurrentTx({ ...currentTx, isIncome: !currentTx.isIncome })}
          />
          <Button title="Save" onPress={handleSave} />
          <Button
            title="Cancel"
            onPress={() => {
              setModalVisible(false);
              setCurrentTx({});
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    marginVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    marginTop: 50,
  },
  input: {
    borderWidth: 1,
    padding: 8,
    marginVertical: 8,
  },
});
