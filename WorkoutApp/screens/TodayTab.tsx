
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity } from 'react-native';
import styles from '../styles/todayStyles';
import ModalButtons from '../components/ModalButtons';
import ConfirmModal from '../components/ConfirmModal';
import ExerciseCard from '../components/ExerciseCard';
import BodyweightModal from '../components/BodyweightModal';
import WorkoutControls from '../components/WorkoutControls';
// Import icons at runtime to avoid type errors when package isn't installed in the environment
let IconFeather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Feather: _Feather } = require('@expo/vector-icons');
  } catch (e) {
    IconFeather = null;
  }

import * as api from '../lib/api';
