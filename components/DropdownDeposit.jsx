import React from "react";
import {
  TouchableOpacity,
  Text,
  Modal,
  View,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DropdownDeposit = ({
  open,
  value,
  items,
  setOpen,
  setValue,
  placeholder,
}) => {
  const selectedItem = items.find(item => item.value === value);
  
  return (
    <>
      <TouchableOpacity
        style={{
          height: 50,
          width: "95%",
          margin: 10,
          backgroundColor: "white",
          borderColor: "black",
          borderWidth: 2,
          borderRadius: 15,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
        onPress={() => setOpen(true)}
      >
        <Text style={{ fontSize: 16, color: "#333", flex: 1 }}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down-outline"
          size={20}
          color="#333"
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 24,
            padding: 0,
            width: '92%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 12,
            overflow: 'hidden',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 20,
              paddingHorizontal: 24,
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
              backgroundColor: '#fafbfc',
              position: 'relative',
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#333',
                flex: 1,
                textAlign: 'center',
                paddingRight: 40,
                paddingLeft: 24,
              }}>
                Select Option
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: '#eee' }} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 18,
                    paddingHorizontal: 24,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0f0f0',
                    backgroundColor: '#fff',
                  }}
                  onPress={() => {
                    setValue(item.value);
                    setOpen(false);
                  }}
                >
                  <View style={{
                    fontSize: 17,
                    color: '#222',
                    fontWeight: '500',
                  }}>
                    <Text>{item.label}</Text>
                  </View>
                  {value === item.value && (
                    <View style={{
                      backgroundColor: '#333',
                      borderRadius: 12,
                      width: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default DropdownDeposit;
