import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import uiReducerSelector from "@/store/reducers/ui-reducer/ui-reducer-selector";
import {
  UINotificationEnum,
  setUINotification,
} from "@/store/reducers/ui-reducer/ui-slice";

const useUINotification = (): void => {
  const dispatch = useDispatch();
  const uiNotification = useSelector(uiReducerSelector.getUINotification);

  const { duration, message, notificationType, position } =
    uiNotification ?? {};

  useEffect(() => {
    if (message) {
      const otherProps = {
        duration: duration ?? 3000,
        position: position ?? "top-center",
      };

      switch (notificationType) {
        case UINotificationEnum.ERROR:
          toast.error(message, otherProps);
          break;

        case UINotificationEnum.WARNING:
          toast.warning(message, otherProps);
          break;

        case UINotificationEnum.SUCCESS:
          toast.success(message, otherProps);
          break;

        case UINotificationEnum.INFO:
          toast.info(message, otherProps);
          break;

        default:
          toast(message, otherProps);
      }
    }

    dispatch(
      setUINotification({
        message: "",
        notificationType: UINotificationEnum.DEFAULT,
      })
    );
  }, [dispatch, duration, message, notificationType, position]);
};

export default useUINotification;
