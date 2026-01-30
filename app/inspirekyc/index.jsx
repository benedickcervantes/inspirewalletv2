import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Image,
  Keyboard,
} from "react-native";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigation, useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, firestore, storage } from "../../configs/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";

export default function InspireKYC() {
  const navigation = useNavigation();
  const router = useRouter();
  
  // Page and step management
  const [showKYC, setShowKYC] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1 - Personal Information
    lastName: '',
    firstName: '',
    birthday: new Date(),
    gender: '',
    nationality: '',
    sourceOfIncome: '',
    monthlyIncome: '',
    
    // Step 2 - Address Information
    country: '',
    fullAddress: '',
    postalCode: '',
    
    // Step 3 - Documents
    idFrontPhoto: null,
    idBackPhoto: null,
    selfiePhoto: null,
  });
  
  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNationalityModal, setShowNationalityModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showIncomeSourceModal, setShowIncomeSourceModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(''); // 'uploading', 'saving', 'success', 'error'
  const [nationalities, setNationalities] = useState([]);
  const [filteredNationalities, setFilteredNationalities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [kycButtonPressed, setKycButtonPressed] = useState(false);
  
  // User data and KYC status
  const [userData, setUserData] = useState(null);
  const [kycStatus, setKycStatus] = useState(false); // Default to false instead of null
  const [loading, setLoading] = useState(true);

  // Derived flags
  const hasCompany = !!(userData?.company && userData.company.trim() !== "" && userData.company.trim() !== t(userData?.preferredLanguage || 'English', 'general.notAvailable'));
  const effectiveTotalSteps = totalSteps - 1;
  
  // Keyboard handling
  const scrollViewRef = useRef(null);
  
  // Gender options
  const genderOptions = useMemo(() => [
    { id: 'male', label: t(userData?.preferredLanguage || 'English', 'kyc.options.gender.male') },
    { id: 'female', label: t(userData?.preferredLanguage || 'English', 'kyc.options.gender.female') },
    { id: 'other', label: t(userData?.preferredLanguage || 'English', 'kyc.options.gender.other') },
    { id: 'prefer_not_to_say', label: t(userData?.preferredLanguage || 'English', 'kyc.options.gender.preferNotToSay') }
  ], [userData?.preferredLanguage]);
  
  // Income source options
  const incomeSourceOptions = useMemo(() => [
    { id: 'employment', label: t(userData?.preferredLanguage || 'English', 'kyc.options.incomeSource.employment') },
    { id: 'business', label: t(userData?.preferredLanguage || 'English', 'kyc.options.incomeSource.business') },
    { id: 'investment', label: t(userData?.preferredLanguage || 'English', 'kyc.options.incomeSource.investment') },
    { id: 'freelance', label: t(userData?.preferredLanguage || 'English', 'kyc.options.incomeSource.freelance') },
    { id: 'pension', label: t(userData?.preferredLanguage || 'English', 'kyc.options.incomeSource.pension') },
    { id: 'other', label: t(userData?.preferredLanguage || 'English', 'kyc.options.incomeSource.other') }
  ], [userData?.preferredLanguage]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
    fetchNationalities();
    checkUserDataAndKYCStatus();
  }, []);

  // Force re-render when language changes
  useEffect(() => {
    // This will trigger a re-render when userData.preferredLanguage changes
  }, [userData?.preferredLanguage]);

  // Ensure proper state management when showKYC changes
  useEffect(() => {
    console.log('showKYC changed to:', showKYC);
    if (!showKYC && !kycButtonPressed) {
      // Reset form when KYC is closed
      setCurrentStep(1);
      resetFormData();
    }
  }, [showKYC, kycButtonPressed]);
  
  // Check user data and KYC status
  const checkUserDataAndKYCStatus = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user data from Firestore
      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log('User data:', userData);
        setUserData(userData);
        
        // Check KYC approval status
        const kycApproved = userData.kycApproved || false;
        console.log('KYC Approved status:', kycApproved);
        setKycStatus(kycApproved);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking user data and KYC status:', error);
      setLoading(false);
    }
  };

  // Comprehensive nationality mapping for all countries
  const getNationalityFromCountry = (countryName, demonyms) => {
    // Comprehensive mapping for countries that need special nationality handling
    const nationalityMapping = {
      'Philippines': 'Filipino',
      'United States': 'American',
      'United Kingdom': 'British',
      'Netherlands': 'Dutch',
      'New Zealand': 'New Zealander',
      'South Korea': 'South Korean',
      'North Korea': 'North Korean',
      'Czech Republic': 'Czech',
      'Czechia': 'Czech',
      'United Arab Emirates': 'Emirati',
      'Myanmar': 'Burmese',
      'Brunei': 'Bruneian',
      'Switzerland': 'Swiss',
      'Belarus': 'Belarusian',
      'Greece': 'Greek',
      'Iceland': 'Icelander',
      'Ireland': 'Irish',
      'Luxembourg': 'Luxembourger',
      'Monaco': 'Monégasque',
      'San Marino': 'Sammarinese',
      'Vatican City': 'Vatican',
      'Liechtenstein': 'Liechtensteiner',
      'Malta': 'Maltese',
      'Andorra': 'Andorran',
      'Cyprus': 'Cypriot',
      'Denmark': 'Danish',
      'Finland': 'Finnish',
      'Poland': 'Polish',
      'Sweden': 'Swedish',
      'Turkey': 'Turkish',
      'Thailand': 'Thai',
      'Laos': 'Lao',
      'Vietnam': 'Vietnamese',
      'Cambodia': 'Cambodian',
      'Indonesia': 'Indonesian',
      'Malaysia': 'Malaysian',
      'Singapore': 'Singaporean',
      'Bangladesh': 'Bangladeshi',
      'Nepal': 'Nepalese',
      'Sri Lanka': 'Sri Lankan',
      'Bhutan': 'Bhutanese',
      'Maldives': 'Maldivian',
      'Afghanistan': 'Afghan',
      'Pakistan': 'Pakistani',
      'Iran': 'Iranian',
      'Iraq': 'Iraqi',
      'Israel': 'Israeli',
      'Jordan': 'Jordanian',
      'Lebanon': 'Lebanese',
      'Syria': 'Syrian',
      'Yemen': 'Yemeni',
      'Oman': 'Omani',
      'Qatar': 'Qatari',
      'Kuwait': 'Kuwaiti',
      'Bahrain': 'Bahraini',
      'Saudi Arabia': 'Saudi',
      'Egypt': 'Egyptian',
      'Sudan': 'Sudanese',
      'Libya': 'Libyan',
      'Tunisia': 'Tunisian',
      'Algeria': 'Algerian',
      'Morocco': 'Moroccan',
      'Ethiopia': 'Ethiopian',
      'Kenya': 'Kenyan',
      'Tanzania': 'Tanzanian',
      'Uganda': 'Ugandan',
      'Rwanda': 'Rwandan',
      'Ghana': 'Ghanaian',
      'Nigeria': 'Nigerian',
      'Senegal': 'Senegalese',
      'Mali': 'Malian',
      'Niger': 'Nigerien',
      'Chad': 'Chadian',
      'Cameroon': 'Cameroonian',
      'Gabon': 'Gabonese',
      'Congo': 'Congolese',
      'Zambia': 'Zambian',
      'Zimbabwe': 'Zimbabwean',
      'Botswana': 'Motswana',
      'Namibia': 'Namibian',
      'Mozambique': 'Mozambican',
      'Madagascar': 'Malagasy',
      'Mauritius': 'Mauritian',
      'Seychelles': 'Seychellois',
      'Fiji': 'Fijian',
      'Papua New Guinea': 'Papua New Guinean',
      'Solomon Islands': 'Solomon Islander',
      'Vanuatu': 'Ni-Vanuatu',
      'Samoa': 'Samoan',
      'Tonga': 'Tongan',
      'Marshall Islands': 'Marshallese',
      'Micronesia': 'Micronesian',
      'Palau': 'Palauan',
      'Nauru': 'Nauruan',
      'Kiribati': 'I-Kiribati',
      'Tuvalu': 'Tuvaluan',
      'Chile': 'Chilean',
      'Peru': 'Peruvian',
      'Paraguay': 'Paraguayan',
      'Uruguay': 'Uruguayan',
      'Guyana': 'Guyanese',
      'Suriname': 'Surinamese',
      'Belize': 'Belizean',
      'Guatemala': 'Guatemalan',
      'Honduras': 'Honduran',
      'El Salvador': 'Salvadoran',
      'Nicaragua': 'Nicaraguan',
      'Costa Rica': 'Costa Rican',
      'Panama': 'Panamanian',
      'Haiti': 'Haitian',
      'Jamaica': 'Jamaican',
      'Trinidad and Tobago': 'Trinidadian',
      'Barbados': 'Barbadian',
      'Bahamas': 'Bahamian',
      'Dominica': 'Dominican',
      'Saint Lucia': 'Saint Lucian',
      'Saint Vincent and the Grenadines': 'Vincentian',
      'Grenada': 'Grenadian',
      'Antigua and Barbuda': 'Antiguan',
      'Saint Kitts and Nevis': 'Kittitian',
    };

    // Check mapping first
    if (nationalityMapping[countryName]) {
      return nationalityMapping[countryName];
    }

    // Try to extract from demonyms API structure
    if (demonyms?.eng) {
      // Try male form first (most common)
      if (demonyms.eng.m) {
        return demonyms.eng.m;
      }
      // Try female form
      if (demonyms.eng.f) {
        return demonyms.eng.f;
      }
      // Try direct form
      if (typeof demonyms.eng === 'string') {
        return demonyms.eng;
      }
    }

    // Fallback: try to generate from country name
    // Remove common suffixes and add common nationality endings
    const lowerName = countryName.toLowerCase();
    if (lowerName.endsWith('ia')) {
      return countryName.slice(0, -2) + 'ian';
    }
    if (lowerName.endsWith('land')) {
      return countryName.slice(0, -4) + 'er';
    }
    if (lowerName.endsWith('stan')) {
      return countryName.slice(0, -4) + 'i';
    }
    if (lowerName.endsWith('a')) {
      return countryName.slice(0, -1) + 'an';
    }
    if (lowerName.endsWith('y')) {
      return countryName.slice(0, -1) + 'ian';
    }

    // Last resort: return country name (will be filtered out if needed)
    return countryName;
  };

  // Fetch nationalities and countries from REST Countries API
  const fetchNationalities = async () => {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,demonyms');
      const countriesData = await response.json();
      
      // Create nationality list using proper nationality extraction
      const nationalityMap = new Map();
      
      countriesData.forEach(country => {
        const countryName = country.name.common;
        const nationality = getNationalityFromCountry(countryName, country.demonyms);
        
        // Skip if nationality is invalid or equals country name
        if (!nationality || nationality === countryName) {
          return;
        }
        
        // Normalize nationality (case-insensitive) for deduplication
        const normalizedNationality = nationality.trim();
        const lowerNationality = normalizedNationality.toLowerCase();
        
        // Only add if we haven't seen this nationality before
        if (!nationalityMap.has(lowerNationality)) {
          nationalityMap.set(lowerNationality, {
            id: normalizedNationality,
            label: normalizedNationality,
            countryName: countryName
          });
        }
      });
      
      // Convert map to array and sort
      const nationalityList = Array.from(nationalityMap.values())
        .sort((a, b) => a.label.localeCompare(b.label));
      
      // Create country list using country names
      const countryList = countriesData
        .map(country => ({
          id: country.name.common,
          label: country.name.common
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      
      setNationalities(nationalityList);
      setFilteredNationalities(nationalityList);
      setCountries(countryList);
      setFilteredCountries(countryList);
    } catch (error) {
      console.error('Error fetching nationalities:', error);
      // Fallback to basic list
      const fallbackNationalities = [
        { id: 'filipino', label: 'Filipino', countryName: 'Philippines' },
        { id: 'american', label: 'American', countryName: 'United States' },
        { id: 'british', label: 'British', countryName: 'United Kingdom' },
        { id: 'chinese', label: 'Chinese', countryName: 'China' },
        { id: 'japanese', label: 'Japanese', countryName: 'Japan' },
      ];
      const fallbackCountries = [
        { id: 'philippines', label: 'Philippines' },
        { id: 'united states', label: 'United States' },
        { id: 'united kingdom', label: 'United Kingdom' },
        { id: 'china', label: 'China' },
        { id: 'japan', label: 'Japan' },
      ];
      setNationalities(fallbackNationalities);
      setFilteredNationalities(fallbackNationalities);
      setCountries(fallbackCountries);
      setFilteredCountries(fallbackCountries);
    }
  };
  
  // Filter nationalities based on search
  const filterNationalities = (query) => {
    setSearchQuery(query);
    if (query === '') {
      setFilteredNationalities(nationalities);
    } else {
      const filtered = nationalities.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredNationalities(filtered);
    }
  };

  // Filter countries based on search
  const filterCountries = (query) => {
    setSearchQuery(query);
    if (query === '') {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  };
  
  // Image picker functions
  const pickImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormData(prev => ({
          ...prev,
          [type]: result.assets[0]
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image. Please try again.");
      console.error("Image picker error:", error);
    }
  };

  const takePicture = async (type) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData(prev => ({
        ...prev,
        [type]: result.assets[0]
      }));
    }
  };
  
  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < effectiveTotalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Close KYC modal
  const closeKYCModal = () => {
    console.log('Closing KYC modal');
    setShowKYC(false);
    setKycButtonPressed(false);
    // Use setTimeout to ensure state updates properly on iOS
    setTimeout(() => {
      setCurrentStep(1);
      resetFormData();
    }, 100);
  };

  // Start KYC process
  const startKYCProcess = () => {
    console.log('Starting KYC process');
    setKycButtonPressed(true);
    setShowKYC(true);
    setCurrentStep(1);
    resetFormData();
  };
  
  // Age validation function
  const isUser18OrOlder = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  // Validation functions
  const validateStep1 = () => {
    return formData.lastName && formData.firstName && formData.gender && 
           formData.nationality && formData.sourceOfIncome && formData.monthlyIncome &&
           isUser18OrOlder(formData.birthday);
  };
  
  const validateStep2 = () => {
    return formData.country && formData.fullAddress && formData.postalCode;
  };
  
  const validateStep3 = () => {
    return formData.idFrontPhoto && formData.idBackPhoto && formData.selfiePhoto;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to submit KYC");
        return;
      }

      // Show submission modal
      setShowSubmissionModal(true);
      setSubmissionStatus('uploading');

      // Upload ID front photo
      const idFrontPhotoRef = ref(storage, `kyc/${user.uid}/id_front_${Date.now()}`);
      const idFrontPhotoResponse = await fetch(formData.idFrontPhoto.uri);
      const idFrontPhotoBlob = await idFrontPhotoResponse.blob();
      const idFrontPhotoSnapshot = await uploadBytes(idFrontPhotoRef, idFrontPhotoBlob);
      const idFrontPhotoUrl = await getDownloadURL(idFrontPhotoSnapshot.ref);

      // Upload ID back photo
      const idBackPhotoRef = ref(storage, `kyc/${user.uid}/id_back_${Date.now()}`);
      const idBackPhotoResponse = await fetch(formData.idBackPhoto.uri);
      const idBackPhotoBlob = await idBackPhotoResponse.blob();
      const idBackPhotoSnapshot = await uploadBytes(idBackPhotoRef, idBackPhotoBlob);
      const idBackPhotoUrl = await getDownloadURL(idBackPhotoSnapshot.ref);

      // Upload selfie photo
      const selfiePhotoRef = ref(storage, `kyc/${user.uid}/selfie_${Date.now()}`);
      const selfiePhotoResponse = await fetch(formData.selfiePhoto.uri);
      const selfiePhotoBlob = await selfiePhotoResponse.blob();
      const selfiePhotoSnapshot = await uploadBytes(selfiePhotoRef, selfiePhotoBlob);
      const selfiePhotoUrl = await getDownloadURL(selfiePhotoSnapshot.ref);

      setSubmissionStatus('saving');

      // Prepare KYC request data
      const kycData = {
        userId: user.uid,
        status: 'pending',
        submittedAt: serverTimestamp(),
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          birthday: formData.birthday.toISOString(),
          gender: formData.gender,
          nationality: formData.nationality,
          sourceOfIncome: formData.sourceOfIncome,
          monthlyIncome: formData.monthlyIncome,
        },
        addressInfo: {
          country: formData.country,
          fullAddress: formData.fullAddress,
          postalCode: formData.postalCode,
        },
        documents: {
          idFrontPhoto: idFrontPhotoUrl,
          idBackPhoto: idBackPhotoUrl,
          selfiePhoto: selfiePhotoUrl,
        }
      };

      // Save to Firestore
      const kycRequestsRef = collection(firestore, 'kycRequest');
      await addDoc(kycRequestsRef, kycData);

      setSubmissionStatus('success');

      // Auto close modal after 2 seconds and navigate back
      setTimeout(() => {
        setShowSubmissionModal(false);
        setSubmissionStatus('');
        router.back();
      }, 2000);

    } catch (error) {
      console.error('Error submitting KYC:', error);
      setSubmissionStatus('error');
      
      // Auto close error modal after 3 seconds
      setTimeout(() => {
        setShowSubmissionModal(false);
        setSubmissionStatus('');
      }, 3000);
    }
  };
  
  // Update form data
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle input focus for keyboard scrolling
  const handleInputFocus = () => {
    // Just ensure the keyboard is handled by KeyboardAvoidingView
    // No aggressive scrolling needed
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      // Step 1 - Personal Information
      lastName: '',
      firstName: '',
      birthday: new Date(),
      gender: '',
      nationality: '',
      sourceOfIncome: '',
      monthlyIncome: '',
      
      // Step 2 - Address Information
      country: '',
      fullAddress: '',
      postalCode: '',
      
      // Step 3 - Documents
      idFrontPhoto: null,
      idBackPhoto: null,
      selfiePhoto: null,
    });
  };

  // Render initial premium features page
  const renderPremiumFeatures = () => {
    if (loading) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark" size={40} color={Colors.newYearTheme.background} />
            <Text style={[styles.cardTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.loading.text')}
            </Text>
          </View>
          <View style={styles.contentContainer}>
            <Text style={[styles.description, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.messages.uploadingDocuments')}
            </Text>
          </View>
        </View>
      );
    }

    const accountType = userData?.accountType || "Basic";
    const isPremium = accountType === "Premium";
    const needsKYC = kycStatus === false; // Show KYC button if kycApproved is explicitly false
    
    console.log('Debug renderPremiumFeatures:');
    console.log('Account type:', accountType);
    console.log('Is Premium:', isPremium);
    console.log('KYC Status:', kycStatus);
    console.log('Needs KYC:', needsKYC);
    console.log('Should show button:', needsKYC || !isPremium);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons 
            name={isPremium ? "diamond" : "shield-checkmark"} 
            size={40} 
            color={Colors.newYearTheme.background} 
          />
          <Text style={[styles.cardTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {isPremium ? t(userData?.preferredLanguage || 'English', 'kyc.header.premiumAccount') : t(userData?.preferredLanguage || 'English', 'kyc.header.premiumFeatures')}
          </Text>
        </View>

        <View style={styles.contentContainer}>
          {isPremium && kycStatus ? (
            // Premium user with approved KYC
            <>
              <Text style={[styles.description, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.premium.congratulations')}
              </Text>
              <View style={styles.featuresContainer}>
                <Text style={[styles.featuresTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.premium.yourPremiumFeatures')}
                </Text>
                <View style={styles.featureItem}>
                  <Ionicons name="diamond" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.cryptoTrading')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="card" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.inspireCards')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="trending-up" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.advancedInvestment')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="star" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.prioritySupport')}
                  </Text>
                </View>
              </View>
            </>
          ) : isPremium && needsKYC ? (
            // Premium user but needs KYC approval
            <>
              <Text style={[styles.description, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.premium.pendingKYC')}
              </Text>
              <View style={styles.featuresContainer}>
                <Text style={[styles.featuresTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.premium.premiumFeaturesPending')}
                </Text>
                <View style={styles.featureItem}>
                  <Ionicons name="diamond" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.cryptoTrading')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="card" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.inspireCards')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="trending-up" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.advancedInvestment')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="star" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.prioritySupport')}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            // Basic user - show upgrade message
            <>
              <Text style={[styles.description, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.premium.upgradeMessage')}
              </Text>
              <View style={styles.featuresContainer}>
                <Text style={[styles.featuresTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.premium.premiumFeatures')}
                </Text>
                <View style={styles.featureItem}>
                  <Ionicons name="diamond" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.cryptoTrading')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="card" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.inspireCards')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="trending-up" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.advancedInvestment')}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="star" size={20} color="#f39c12" />
                  <Text style={[styles.featureText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.premium.features.prioritySupport')}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Show KYC button for Basic users or Premium users with pending KYC */}
          {(!isPremium || (isPremium && needsKYC)) && (
            <TouchableOpacity
              style={styles.startKYCButton}
              onPress={startKYCProcess}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.startKYCButtonText}>
                {isPremium ? t(userData?.preferredLanguage || 'English', 'kyc.buttons.completeKYC') : t(userData?.preferredLanguage || 'English', 'kyc.buttons.startKYC')}
              </Text>
            </TouchableOpacity>
          )}
          

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              router.push("/helpcenter");
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={20} color={Colors.newYearTheme.text} />
            <Text style={styles.contactButtonText}>
              {t(userData?.preferredLanguage || 'English', 'kyc.buttons.contactSupport')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (showKYC || kycButtonPressed) {
              if (currentStep === 1) {
                closeKYCModal();
              } else {
                goToPreviousStep();
              }
            } else {
              navigation.goBack();
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.newYearTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
          {(showKYC || kycButtonPressed) ? t(userData?.preferredLanguage || 'English', 'kyc.header.title') : 
           (userData?.accountType === "Premium" ? t(userData?.preferredLanguage || 'English', 'kyc.header.premiumAccount') : t(userData?.preferredLanguage || 'English', 'kyc.header.premiumFeatures'))}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {(showKYC || kycButtonPressed) && (
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.progress.step').replace('{current}', currentStep).replace('{total}', effectiveTotalSteps)}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / effectiveTotalSteps) * 100}%` }]} />
          </View>
        </View>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
        >
          {(showKYC || kycButtonPressed) ? renderStepContent() : renderPremiumFeatures()}
          <View style={{ height: 200 }} />
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Modals */}
      {(showKYC || kycButtonPressed) && renderModals()}
    </ImageBackground>
  );

  // Step 1: Personal Information
  function renderStep1() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Ionicons name="person" size={40} color={Colors.newYearTheme.background} />
          <Text style={[styles.stepTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.steps.personalInfo.title')}
          </Text>
          <Text style={[styles.stepDescription, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.steps.personalInfo.description')}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* First Name and Last Name in Row */}
          <View style={styles.nameRow}>
            {/* First Name */}
            <View style={[styles.inputGroup, styles.nameColumn]}>
              <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.fields.firstName')} *
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.firstName}
                onChangeText={(text) => updateFormData('firstName', text)}
                placeholder={t(userData?.preferredLanguage || 'English', 'kyc.placeholders.firstName')}
                placeholderTextColor="#999"
                onFocus={handleInputFocus}
              />
            </View>

            {/* Last Name */}
            <View style={[styles.inputGroup, styles.nameColumn]}>
              <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.fields.lastName')} *
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.lastName}
                onChangeText={(text) => updateFormData('lastName', text)}
                placeholder={t(userData?.preferredLanguage || 'English', 'kyc.placeholders.lastName')}
                placeholderTextColor="#999"
                onFocus={handleInputFocus}
              />
            </View>
          </View>

          {/* Company Name - Read Only */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.companyName')}
            </Text>
            <TextInput
              style={[styles.textInput, styles.readOnlyInput]}
              value={userData?.company || t(userData?.preferredLanguage || 'English', 'general.notAvailable')}
              editable={false}
              placeholder={t(userData?.preferredLanguage || 'English', 'general.notAvailable')}
              placeholderTextColor="#999"
            />
          </View>

          {/* Birthday */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.birthday')} *
            </Text>
            <TouchableOpacity
              style={[
                styles.selectInput,
                !isUser18OrOlder(formData.birthday) && styles.errorInput
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[
                styles.selectInputText,
                !isUser18OrOlder(formData.birthday) && styles.errorText
              ]}>
                {formData.birthday.toLocaleDateString()}
              </Text>
              <Ionicons 
                name="calendar" 
                size={20} 
                color={!isUser18OrOlder(formData.birthday) ? "#e74c3c" : Colors.newYearTheme.text} 
              />
            </TouchableOpacity>
            {!isUser18OrOlder(formData.birthday) && (
              <Text style={[styles.errorMessage, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.messages.ageRequirement')}
              </Text>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={formData.birthday}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    updateFormData('birthday', selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.gender')} *
            </Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowGenderModal(true)}
            >
              <Text style={styles.selectInputText}>
                {formData.gender ? genderOptions.find(g => g.id === formData.gender)?.label : t(userData?.preferredLanguage || 'English', 'kyc.modals.selectGender')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.newYearTheme.text} />
            </TouchableOpacity>
          </View>

          {/* Nationality */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.nationality')} *
            </Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowNationalityModal(true)}
            >
              <Text style={styles.selectInputText}>
                {formData.nationality || t(userData?.preferredLanguage || 'English', 'kyc.modals.selectNationality')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.newYearTheme.text} />
            </TouchableOpacity>
          </View>

          {/* Source of Income */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.sourceOfIncome')} *
            </Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowIncomeSourceModal(true)}
            >
              <Text style={styles.selectInputText}>
                {formData.sourceOfIncome ? 
                  incomeSourceOptions.find(i => i.id === formData.sourceOfIncome)?.label : 
                  t(userData?.preferredLanguage || 'English', 'kyc.modals.selectIncomeSource')
                }
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.newYearTheme.text} />
            </TouchableOpacity>
          </View>

          {/* Monthly Income */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.monthlyIncome')} *
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.monthlyIncome}
              onChangeText={(text) => updateFormData('monthlyIncome', text)}
              placeholder={t(userData?.preferredLanguage || 'English', 'kyc.placeholders.monthlyIncome')}
              placeholderTextColor="#999"
              keyboardType="numeric"
              onFocus={handleInputFocus}
            />
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={[styles.nextButton, !validateStep1() && styles.disabledButton]}
            onPress={goToNextStep}
            disabled={!validateStep1()}
            activeOpacity={0.7}
          >
            <Text style={styles.nextButtonText}>
              {t(userData?.preferredLanguage || 'English', 'kyc.buttons.next')}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 2: Address Information
  function renderStep2() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Ionicons name="location" size={40} color={Colors.newYearTheme.background} />
          <Text style={[styles.stepTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.steps.addressInfo.title')}
          </Text>
          <Text style={[styles.stepDescription, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.steps.addressInfo.description')}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Country */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.country')} *
            </Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowCountryModal(true)}
            >
              <Text style={styles.selectInputText}>
                {formData.country || t(userData?.preferredLanguage || 'English', 'kyc.modals.selectCountry')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.newYearTheme.text} />
            </TouchableOpacity>
          </View>

          {/* Full Address */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.fullAddress')} *
            </Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              value={formData.fullAddress}
              onChangeText={(text) => updateFormData('fullAddress', text)}
              placeholder={t(userData?.preferredLanguage || 'English', 'kyc.placeholders.fullAddress')}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              onFocus={handleInputFocus}
              blurOnSubmit={false}
              returnKeyType="default"
            />
          </View>

          {/* Postal Code */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.postalCode')} *
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.postalCode}
              onChangeText={(text) => updateFormData('postalCode', text)}
              placeholder={t(userData?.preferredLanguage || 'English', 'kyc.placeholders.postalCode')}
              placeholderTextColor="#999"
              keyboardType="numeric"
              onFocus={handleInputFocus}
            />
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.previousButton}
              onPress={goToPreviousStep}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.newYearTheme.text} />
              <Text style={styles.previousButtonText}>
                {t(userData?.preferredLanguage || 'English', 'kyc.buttons.previous')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, !validateStep2() && styles.disabledButton]}
              onPress={goToNextStep}
              disabled={!validateStep2()}
              activeOpacity={0.7}
            >
              <Text style={styles.nextButtonText}>
                {t(userData?.preferredLanguage || 'English', 'kyc.buttons.next')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Step 3: Document Upload
  function renderStep3() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Ionicons name="document-text" size={40} color={Colors.newYearTheme.background} />
          <Text style={[styles.stepTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.steps.personalDocuments.title')}
          </Text>
          <Text style={[styles.stepDescription, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.steps.personalDocuments.description')}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* ID Upload */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.idFront')} *
            </Text>
            <Text style={[styles.inputHint, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.hints.idFront')}
            </Text>
            
            {formData.idFrontPhoto ? (
              <View style={styles.uploadedImageContainer}>
                <Image source={{ uri: formData.idFrontPhoto.uri }} style={styles.uploadedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => updateFormData('idFrontPhoto', null)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadButtonsContainer}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => takePicture('idFrontPhoto')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={24} color={Colors.newYearTheme.text} />
                  <Text style={styles.uploadButtonText}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.buttons.takePhoto')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('idFrontPhoto')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images" size={24} color={Colors.newYearTheme.text} />
                  <Text style={styles.uploadButtonText}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.buttons.chooseFromGallery')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ID Back Upload */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.idBack')} *
            </Text>
            <Text style={[styles.inputHint, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.hints.idBack')}
            </Text>
            
            {formData.idBackPhoto ? (
              <View style={styles.uploadedImageContainer}>
                <Image source={{ uri: formData.idBackPhoto.uri }} style={styles.uploadedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => updateFormData('idBackPhoto', null)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadButtonsContainer}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => takePicture('idBackPhoto')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={24} color={Colors.newYearTheme.text} />
                  <Text style={styles.uploadButtonText}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.buttons.takePhoto')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('idBackPhoto')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images" size={24} color={Colors.newYearTheme.text} />
                  <Text style={styles.uploadButtonText}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.buttons.chooseFromGallery')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Selfie Upload */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.fields.selfiePhoto')} *
            </Text>
            <Text style={[styles.inputHint, getRTLStyles(userData?.preferredLanguage || 'English')]}>
              {t(userData?.preferredLanguage || 'English', 'kyc.hints.selfiePhoto')}
            </Text>
            
            {formData.selfiePhoto ? (
              <View style={styles.uploadedImageContainer}>
                <Image source={{ uri: formData.selfiePhoto.uri }} style={styles.uploadedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => updateFormData('selfiePhoto', null)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadButtonsContainer}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => takePicture('selfiePhoto')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={24} color={Colors.newYearTheme.text} />
                  <Text style={styles.uploadButtonText}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.buttons.takePhoto')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('selfiePhoto')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images" size={24} color={Colors.newYearTheme.text} />
                  <Text style={styles.uploadButtonText}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.buttons.chooseFromGallery')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.previousButton}
              onPress={goToPreviousStep}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.newYearTheme.text} />
              <Text style={styles.previousButtonText}>
                {t(userData?.preferredLanguage || 'English', 'kyc.buttons.previous')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, !validateStep3() && styles.disabledButton]}
              onPress={goToNextStep}
              disabled={!validateStep3()}
              activeOpacity={0.7}
            >
              <Text style={styles.nextButtonText}>
                {t(userData?.preferredLanguage || 'English', 'kyc.buttons.next')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Step 4: Summary and Submission
  function renderStep4() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Ionicons name="checkmark-circle" size={40} color={Colors.newYearTheme.background} />
          <Text style={[styles.stepTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.steps.review.title')}
          </Text>
          <Text style={[styles.stepDescription, getRTLStyles(userData?.preferredLanguage || 'English')]}>
            {t(userData?.preferredLanguage || 'English', 'kyc.steps.review.description')}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Personal Information Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summarySectionHeader}>
              <Text style={[styles.summarySectionTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.personalInfo')}
              </Text>
              <TouchableOpacity onPress={() => setCurrentStep(1)}>
                <Text style={styles.editButton}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.buttons.edit')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.name')}
              </Text>
              <Text style={styles.summaryValue}>{formData.firstName} {formData.lastName}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.birthday')}
              </Text>
              <Text style={styles.summaryValue}>{formData.birthday.toLocaleDateString()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.gender')}
              </Text>
              <Text style={styles.summaryValue}>
                {genderOptions.find(g => g.id === formData.gender)?.label}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.nationality')}
              </Text>
              <Text style={styles.summaryValue}>{formData.nationality}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.incomeSource')}
              </Text>
              <Text style={styles.summaryValue}>
                {incomeSourceOptions.find(i => i.id === formData.sourceOfIncome)?.label}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.monthlyIncome')}
              </Text>
              <Text style={styles.summaryValue}>PHP {formData.monthlyIncome}</Text>
            </View>
          </View>

          {/* Address Information Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summarySectionHeader}>
              <Text style={[styles.summarySectionTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.addressInfo')}
              </Text>
              <TouchableOpacity onPress={() => setCurrentStep(2)}>
                <Text style={styles.editButton}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.buttons.edit')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.country')}
              </Text>
              <Text style={styles.summaryValue}>{formData.country}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.address')}
              </Text>
              <Text style={styles.summaryValue}>{formData.fullAddress}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.postalCode')}
              </Text>
              <Text style={styles.summaryValue}>{formData.postalCode}</Text>
            </View>
          </View>

          {/* Personal Documents Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summarySectionHeader}>
              <Text style={[styles.summarySectionTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                {t(userData?.preferredLanguage || 'English', 'kyc.summary.personalDocuments')}
              </Text>
              <TouchableOpacity onPress={() => setCurrentStep(3)}>
                <Text style={styles.editButton}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.buttons.edit')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.documentsGrid}>
              {formData.idFrontPhoto && (
                <View style={styles.documentCard}>
                  <Image source={{ uri: formData.idFrontPhoto.uri }} style={styles.documentImage} />
                  <Text
                    style={styles.documentLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t(userData?.preferredLanguage || 'English', 'kyc.summary.idFront')}
                  </Text>
                </View>
              )}
              {formData.idBackPhoto && (
                <View style={styles.documentCard}>
                  <Image source={{ uri: formData.idBackPhoto.uri }} style={styles.documentImage} />
                  <Text
                    style={styles.documentLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t(userData?.preferredLanguage || 'English', 'kyc.summary.idBack')}
                  </Text>
                </View>
              )}
              {formData.selfiePhoto && (
                <View style={styles.documentCard}>
                  <Image source={{ uri: formData.selfiePhoto.uri }} style={styles.documentImage} />
                  <Text
                    style={styles.documentLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t(userData?.preferredLanguage || 'English', 'kyc.summary.selfiePhoto')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.previousButton}
              onPress={goToPreviousStep}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.newYearTheme.text} />
              <Text style={styles.previousButtonText}>
                {t(userData?.preferredLanguage || 'English', 'kyc.buttons.previous')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {t(userData?.preferredLanguage || 'English', 'kyc.buttons.submit')}
              </Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Render all modals
  function renderModals() {
    return (
      <>
        {/* Gender Selection Modal */}
        <Modal
          visible={showGenderModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGenderModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.popoutModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.modals.selectGender')}
                </Text>
                <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.newYearTheme.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={genderOptions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      updateFormData('gender', item.id);
                      setShowGenderModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Nationality Selection Modal */}
        <Modal
          visible={showNationalityModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowNationalityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.popoutModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.modals.selectNationality')}
                </Text>
                <TouchableOpacity onPress={() => setShowNationalityModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.newYearTheme.text} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder={t(userData?.preferredLanguage || 'English', 'kyc.placeholders.searchNationality')}
                value={searchQuery}
                onChangeText={filterNationalities}
                onFocus={handleInputFocus}
              />
              <FlatList
                data={filteredNationalities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      updateFormData('nationality', item.label);
                      setShowNationalityModal(false);
                      setSearchQuery('');
                      setFilteredNationalities(nationalities);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Income Source Selection Modal */}
        <Modal
          visible={showIncomeSourceModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowIncomeSourceModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.popoutModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.modals.selectIncomeSource')}
                </Text>
                <TouchableOpacity onPress={() => setShowIncomeSourceModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.newYearTheme.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={incomeSourceOptions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      updateFormData('sourceOfIncome', item.id);
                      setShowIncomeSourceModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Country Selection Modal */}
        <Modal
          visible={showCountryModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCountryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.popoutModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                  {t(userData?.preferredLanguage || 'English', 'kyc.modals.selectCountry')}
                </Text>
                <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.newYearTheme.text} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder={t(userData?.preferredLanguage || 'English', 'kyc.placeholders.searchCountry')}
                value={searchQuery}
                onChangeText={filterCountries}
                onFocus={handleInputFocus}
              />
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      updateFormData('country', item.label);
                      setShowCountryModal(false);
                      setSearchQuery('');
                      setFilteredCountries(countries);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Submission Status Modal */}
        <Modal
          visible={showSubmissionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.submissionModalContainer}>
              {submissionStatus === 'uploading' && (
                <>
                  <View style={styles.loadingSpinner}>
                    <Ionicons name="cloud-upload" size={50} color={Colors.newYearTheme.text} />
                  </View>
                  <Text style={[styles.submissionModalTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.status.uploading')}
                  </Text>
                  <Text style={[styles.submissionModalText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.messages.uploadingDocuments')}
                  </Text>
                </>
              )}

              {submissionStatus === 'saving' && (
                <>
                  <View style={styles.loadingSpinner}>
                    <Ionicons name="save" size={50} color={Colors.newYearTheme.text} />
                  </View>
                  <Text style={[styles.submissionModalTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.status.saving')}
                  </Text>
                  <Text style={[styles.submissionModalText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.messages.savingInformation')}
                  </Text>
                </>
              )}

              {submissionStatus === 'success' && (
                <>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={60} color="#27ae60" />
                  </View>
                  <Text style={[styles.submissionModalTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.status.success')}
                  </Text>
                  <Text style={[styles.submissionModalText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.messages.kycSubmitted')}
                  </Text>
                </>
              )}

              {submissionStatus === 'error' && (
                <>
                  <View style={styles.errorIcon}>
                    <Ionicons name="close-circle" size={60} color="#e74c3c" />
                  </View>
                  <Text style={[styles.submissionModalTitle, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.status.error')}
                  </Text>
                  <Text style={[styles.submissionModalText, getRTLStyles(userData?.preferredLanguage || 'English')]}>
                    {t(userData?.preferredLanguage || 'English', 'kyc.messages.submissionFailed')}
                  </Text>
                </>
              )}
            </View>
          </View>
        </Modal>
      </>
    );
  }
}

const styles = StyleSheet.create({
  // Card styles for the initial premium features page
  card: {
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 15,
    marginVertical: 10,
    padding: 20,
    shadowColor: Colors.newYearTheme.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingBottom: 15,
    right: 25,
    borderBottomWidth: 1,
    borderBottomColor: Colors.newYearTheme.text,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
    marginLeft: 10,
  },
  contentContainer: {
    gap: 25,
  },
  description: {
    fontSize: 16,
    color: Colors.newYearTheme.text,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  featuresContainer: {
    gap: 15,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
    textAlign: "center",
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(243, 156, 18, 0.3)",
  },
  featureText: {
    fontSize: 16,
    color: Colors.newYearTheme.text,
    fontWeight: "500",
  },
  startKYCButton: {
    backgroundColor: "#f39c12",
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#f39c12",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#d68910",
    marginTop: 10,
  },
  startKYCButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  contactButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
    marginTop: 5,
  },
  contactButtonText: {
    color: Colors.newYearTheme.text,
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F6F0",
  },
  androidSafeArea: {
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: Colors.newYearTheme.text,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "500",
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(254, 125, 72, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.newYearTheme.text,
    borderRadius: 3,
  },
  stepContainer: {
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 15,
    marginVertical: 10,
    padding: 20,
    shadowColor: Colors.newYearTheme.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 125, 72, 0.3)",
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
    marginTop: 10,
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.newYearTheme.text,
    textAlign: "center",
    opacity: 0.8,
  },
  formContainer: {
    gap: 20,
  },
  nameRow: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 15,
  },
  nameColumn: {
    flex: 1,
    marginBottom: 0,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.newYearTheme.text,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.newYearTheme.text,
    opacity: 0.7,
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.newYearTheme.text,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  readOnlyInput: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    color: Colors.newYearTheme.text,
    opacity: 0.7,
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: "top",
  },
  selectInput: {
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectInputText: {
    fontSize: 14,
    color: Colors.newYearTheme.text,
    flex: 1,
  },
  errorInput: {
    borderColor: "#e74c3c",
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  errorText: {
    color: "#e74c3c",
  },
  errorMessage: {
    fontSize: 12,
    color: "#e74c3c",
    marginTop: 5,
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginTop: 20,
  },
  previousButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
    flex: 1,
  },
  previousButtonText: {
    color: Colors.newYearTheme.text,
    fontSize: 14,
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#f39c12",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#f39c12",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#d68910",
    flex: 1,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#ccc",
    borderColor: "#999",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#27ae60",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#1e8449",
    flex: 1,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  uploadButtonsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  uploadButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
    flex: 1,
    gap: 8,
  },
  uploadButtonText: {
    color: Colors.newYearTheme.text,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  uploadedImageContainer: {
    position: "relative",
    alignSelf: "center",
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.newYearTheme.text,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  summarySection: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.3)",
  },
  summarySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 125, 72, 0.2)",
  },
  summarySubsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.newYearTheme.text,
    marginBottom: 8,
    marginTop: 5,
  },
  summarySubsectionTitleSpacing: {
    marginTop: 16,
  },
  summarySectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
  },
  editButton: {
    color: "#f39c12",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.newYearTheme.text,
    fontWeight: "500",
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.newYearTheme.text,
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
  },
  documentsRow: {
    flexDirection: "row",
    gap: 15,
    justifyContent: "center",
  },
  documentPreview: {
    alignItems: "center",
    gap: 8,
  },
  documentImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
    marginRight: 12,
  },
  documentLabel: {
    fontSize: 12,
    color: Colors.newYearTheme.text,
    fontWeight: "500",
    textAlign: "center",
  },
  documentsGrid: {
    flexDirection: "column",
    gap: 10,
  },
  documentCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.25)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: Colors.newYearTheme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "android" ? 25 : 0,
  },
  popoutModalContainer: {
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 20,
    maxHeight: "80%",
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.newYearTheme.text,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 125, 72, 0.3)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
  },
  searchInput: {
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: Colors.newYearTheme.text,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.newYearTheme.text,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  modalItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 125, 72, 0.1)",
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.newYearTheme.text,
  },
  submissionModalContainer: {
    backgroundColor: Colors.newYearTheme.background,
    borderRadius: 20,
    padding: 30,
    margin: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.newYearTheme.text,
  },
  loadingSpinner: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorIcon: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  submissionModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.newYearTheme.text,
    textAlign: "center",
    marginBottom: 15,
  },
  submissionModalText: {
    fontSize: 14,
    color: Colors.newYearTheme.text,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.9,
  },
});
