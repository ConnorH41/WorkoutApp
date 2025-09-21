import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    flex: 1,
    marginRight: 8,
  },
  splitBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 20,
    marginBottom: 18,
    backgroundColor: '#fafafa',
  },
  splitName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modeBadge: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginLeft: 10,
  },
  currentBadge: {
    backgroundColor: '#dff6e0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginLeft: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  splitActions: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    color: 'red',
    marginLeft: 16,
  },
  splitDaysSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  splitDaysTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  splitDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addDayBtn: {
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  addDayBtnText: {
    color: '#333',
    fontWeight: 'bold',
  },
  assignBtn: {
    backgroundColor: '#eee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  assignBtnText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  daySelectItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
  },
  primaryBtnText: {
    color: '#fff',
  },
  dangerBtn: {
    backgroundColor: '#ff3b30',
    borderWidth: 0,
  },
  dangerBtnText: {
    color: '#fff',
  },
  durationBadge: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  splitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  removeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    height: 36,
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  removeTextStyle: {
    color: '#ff3b30',
    fontWeight: '600',
    fontSize: 12,
  },
});
