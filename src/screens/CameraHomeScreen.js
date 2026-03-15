// CameraHomeScreen.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TouchableWithoutFeedback,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { LanguageContext } from '../context/LanguageContext';

export default function CameraHomeScreen({ navigation }) {

  const { t } = useContext(LanguageContext);

  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [cameraReady, setCameraReady] = useState(false);

  const [zoom, setZoom] = useState(0);
  const zoomHeight = useRef(new Animated.Value(0)).current;

  const focusAnim = useRef(new Animated.Value(0)).current;

  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    const checkOnboarding = async () => {
      const hasSeenTour = await AsyncStorage.getItem('hasSeenTour');
      if (!hasSeenTour) setShowTour(true);
    };
    checkOnboarding();
  }, []);

  const finishTour = async () => {
    await AsyncStorage.setItem('hasSeenTour', 'true');
    setShowTour(false);
  };

  const advanceTour = () => {
    if (tourStep < 2) setTourStep(tourStep + 1);
    else finishTour();
  };

  const handleCapture = () => {
    if (photos.length === 0) {
      setPhotos(['mock_uri_1']);
    } else {
      navigation.navigate('DiseaseResult');
    }
  };

  const handleFocus = () => {

    Animated.sequence([
      Animated.timing(focusAnim,{toValue:1,duration:100,useNativeDriver:true}),
      Animated.timing(focusAnim,{toValue:0,duration:300,useNativeDriver:true})
    ]).start();

  };

  const toggleZoomSlider = () => {

    Animated.timing(zoomHeight,{
      toValue: zoomHeight._value === 0 ? 120 : 0,
      duration:200,
      useNativeDriver:false
    }).start();

  };

  if (!permission) return <View style={styles.container}/>;

  if (!permission.granted) {

    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission required
        </Text>

        <TouchableOpacity
          style={styles.processButton}
          onPress={requestPermission}
        >
          <Text style={styles.processButtonText}>
            Grant Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Camera */}
      <TouchableWithoutFeedback onPress={handleFocus}>
        <CameraView
          style={styles.cameraPreview}
          facing="back"
          enableTorch={flashOn}
          zoom={zoom}
          onCameraReady={()=>setCameraReady(true)}
        />
      </TouchableWithoutFeedback>

      {/* Focus Animation */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.focusRing,
          {opacity:focusAnim}
        ]}
      />

      {/* TOP BAR */}
      <SafeAreaView style={styles.topOverlay}>
        <View style={styles.topControls}>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={()=>setFlashOn(!flashOn)}
          >
            <Ionicons
              name={flashOn ? "flash":"flash-off"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="settings-outline" size={24} color="#fff"/>
          </TouchableOpacity>

        </View>
      </SafeAreaView>


      {/* ZOOM SLIDER */}
      <Animated.View
        style={[
          styles.zoomSlider,
          {height:zoomHeight}
        ]}
      >

        <TouchableOpacity onPress={()=>setZoom(0)}>
          <Text style={styles.zoomText}>1x</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={()=>setZoom(0.3)}>
          <Text style={styles.zoomText}>2x</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={()=>setZoom(0.6)}>
          <Text style={styles.zoomText}>3x</Text>
        </TouchableOpacity>

      </Animated.View>


      {/* BOTTOM CONTROLS */}
      <SafeAreaView style={styles.bottomOverlay}>

        {photos.length > 0 && (
          <View style={styles.multiPhotoBar}>
            <Text style={{color:'white'}}>
              {photos.length} photos selected
            </Text>

            <TouchableOpacity
              style={styles.processButton}
              onPress={()=>navigation.navigate('DiseaseResult')}
            >
              <Text style={styles.processButtonText}>
                {t('processImages')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomControls}>

          <TouchableOpacity style={styles.sideButton}>
            <Ionicons name="images" size={28} color="#fff"/>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButtonOuter}
            onPress={handleCapture}
            onLongPress={toggleZoomSlider}
          >
            <View style={styles.captureButtonInner}/>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideButton}>
            <Ionicons name="sparkles-outline" size={26} color="#fff"/>
            <Text style={styles.aiText}>{t('liveAi')}</Text>
          </TouchableOpacity>

        </View>

      </SafeAreaView>

    </View>
  );
}


const styles = StyleSheet.create({

container:{flex:1,backgroundColor:"#000"},

cameraPreview:{...StyleSheet.absoluteFillObject},

topOverlay:{
position:'absolute',
top:0,
left:0,
right:0
},

topControls:{
flexDirection:'row',
justifyContent:'space-between',
paddingHorizontal:20,
paddingTop:10
},

iconButton:{
width:44,
height:44,
borderRadius:22,
backgroundColor:"rgba(0,0,0,0.35)",
justifyContent:'center',
alignItems:'center'
},

zoomSlider:{
position:'absolute',
bottom:200,
alignSelf:'center',
backgroundColor:"rgba(0,0,0,0.6)",
borderRadius:30,
paddingHorizontal:20,
overflow:'hidden',
justifyContent:'space-evenly'
},

zoomText:{
color:"#fff",
fontSize:18,
fontWeight:"600",
paddingVertical:6
},

bottomOverlay:{
position:'absolute',
bottom:0,
left:0,
right:0,
paddingBottom:30
},

bottomControls:{
flexDirection:'row',
justifyContent:'space-around',
alignItems:'center'
},

sideButton:{
width:60,
alignItems:'center'
},

captureButtonOuter:{
width:84,
height:84,
borderRadius:42,
borderWidth:4,
borderColor:"#fff",
justifyContent:'center',
alignItems:'center'
},

captureButtonInner:{
width:66,
height:66,
borderRadius:33,
backgroundColor:"#fff"
},

aiText:{
color:"#fff",
fontSize:12,
marginTop:3
},

multiPhotoBar:{
flexDirection:'row',
justifyContent:'space-between',
alignItems:'center',
backgroundColor:"rgba(0,0,0,0.6)",
padding:14,
marginBottom:10
},

processButton:{
backgroundColor:"#4CAF50",
paddingHorizontal:18,
paddingVertical:8,
borderRadius:20
},

processButtonText:{
color:"#fff",
fontWeight:"bold"
},

permissionContainer:{
flex:1,
justifyContent:'center',
alignItems:'center',
backgroundColor:"#000"
},

permissionText:{
color:"#fff",
marginBottom:10
},

focusRing:{
position:'absolute',
width:80,
height:80,
borderRadius:40,
borderWidth:2,
borderColor:"#fff",
alignSelf:'center',
top:'40%'
}

});